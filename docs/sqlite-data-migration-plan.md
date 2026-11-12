# SQLite Data Architecture Migration Plan

## 1. Objective

Replace the application's persisted, nested Zustand state with a relational SQLite data architecture.

The release will contain the complete application cutover. On first launch, existing users' data will be converted once, verified, and activated. After activation, SQLite will be the sole authoritative application datastore.

The primary performance objective is:

> Adding years of historical workouts should have little effect on editing today's workout.

The maintainability objective is to give persistence, business rules, queries, caching, and form state clear responsibilities.

### Confirmed scope

- Native **iOS and Android**.
- One coordinated release containing the completed architecture.
- Automatic conversion of the current SQLite-backed persistence.
- Automatic, deterministic repairs where possible, with a saved report.
- Preservation of existing official JSON backup import support.
- Full historical workouts and insights remain accessible.

Direct conversion from the much older React Native AsyncStorage backend is outside the supported upgrade path. Web SQLite is outside this release's platform requirements.

### Delivery model

The tasks below have an implementation order, but they do **not** represent partially deployed architectures. The release is ready only when every application data consumer uses the final data layer.

## 2. Required end-state properties

1. **SQLite owns durable application data.**
2. **Ordinary mutations write only affected records.**
3. **Screens request purpose-built projections**, rather than complete program histories.
4. **Business operations are transactional**, including multi-record workout actions.
5. **SQL and cache invalidation stay outside screens.**
6. **Forms own their drafts** and cannot overwrite newer data with stale snapshots.
7. **Historical ordering and existing workout behavior are preserved.**
8. **Conversion, restore, and reset cannot expose partial datasets.**
9. **Reset cannot cause legacy data to be imported again.**
10. **Caches are disposable and bounded.**
11. **Hidden screens do not continuously recalculate history.**
12. **Failed writes preserve drafts and produce recoverable errors.**

Complete data reconstruction remains available for explicit backup and conversion operations. It is not a normal screen-loading mechanism.

## 3. Target architecture

```text
Screens and presentation components
                ↓
Feature query hooks and form controllers
                ↓
Application queries and transactional commands
                ↓
Typed repositories and framework-independent domain rules
                ↓
Managed Expo SQLite connections
```

### Responsibilities

| Layer                  | Responsibility                                                              |
| ---------------------- | --------------------------------------------------------------------------- |
| SQLite infrastructure  | Connections, statements, transactions, schema versions, database errors     |
| Repositories           | Parameterized SQL and typed row mapping                                     |
| Domain rules           | Workout transitions, planning, completion, deloads, calculations            |
| Application queries    | Consistent, purpose-built read models                                       |
| Application commands   | Intent-based validation and atomic mutations                                |
| Query cache            | Shared results, structural sharing, scoped invalidation, observer lifecycle |
| Forms                  | Local drafts, input strings, validation, submission state                   |
| Bootstrap              | Initialization, legacy conversion, verification, readiness and recovery     |
| Data lifecycle service | Backup, restore, reset, generation changes, retained migration artifacts    |

### Technology choices

- Continue using **`expo-sqlite`**.
- Add **TanStack Query v5** for asynchronous query caching and observer management.
- Use typed SQL repositories directly.
- Keep Zustand only where useful for transient UI coordination, such as modal-selection handoff.
- Keep domain calculations independent of React and SQL.
- Keep the data layer within the Expo application; use the existing shared utility boundaries for reusable pure rules.

### Proposed application structure

```text
apps/expo/src/data/
  database/
    connections
    transactions
    schema
    migrations
    driver
  domain/
    types
    rules
    errors
  repositories/
  queries/
  commands/
  cache/
  react/
  bootstrap/
  legacy/
  backup/
  lifecycle/
```

Organize files by responsibility and feature within these boundaries. Avoid creating a generic framework where straightforward feature modules suffice.

## 4. Database connections and transaction ownership

Use a new application database, provisionally:

```text
activity-log.sqlite
```

The legacy source is a separate SDK-owned key/value database named:

```text
ExpoSQLiteStorage
```

### Writer connection

Maintain one private writer connection.

- Configure foreign keys, WAL, busy handling, and durability before starting transactions.
- Serialize complete write jobs through one application-owned scheduler.
- Use explicit transaction ownership, such as `BEGIN IMMEDIATE` / `COMMIT` / `ROLLBACK`.
- Perform authoritative reads, validation, and writes inside the command's transaction.
- Pass the transaction executor to repository helpers.
- Finalize statements reliably.
- Publish cache effects only after commit.
- Keep the scheduler usable after failed commands.

Start with WAL and `synchronous=FULL`; verify durability and performance on both native platforms.

**Expo-specific requirement:** the installed `withExclusiveTransactionAsync()` creates another connection. Connection-local PRAGMAs configured on the original connection must not be assumed to apply to it. The implementation must use the application's configured connection consistently.

### Reader connection

Maintain one separate, query-only reader connection.

- Serialize complete logical read jobs.
- Use short read transactions for projections requiring multiple SELECTs.
- Return consistent snapshots.
- Finish SQL work before performing expensive presentation formatting.
- Release read transactions promptly so they do not unnecessarily retain WAL growth.

A connection pool is unnecessary initially.

### Command completion

A bounded write should complete after its durable commit and immediate cache publication. It must not wait for unrelated historical analytics to finish refreshing.

## 5. Relational schema

### Identity rules

Preserve healthy existing IDs exactly. IDs are arbitrary strings; equipment already uses values such as `"1"`.

Use uniqueness scopes matching the current ownership model:

- Program IDs: application-wide.
- Session IDs: within a program.
- Activity IDs: within a session.
- Set IDs: within an activity, across both warmup and main sets.
- Saved exercise IDs: application-wide.
- Barbell and plate IDs: within their respective entity types.
- Template-lineage IDs: within a program.

This preserves valid IDs reused under different parents.

### Core tables

| Table              | Principal fields                                                                                           |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `programs`         | ID, name, position                                                                                         |
| `session_lineages` | Program ID, lineage ID                                                                                     |
| `sessions`         | Program/session IDs, lineage ID, name, position, status, deload, timestamps, content revision              |
| `activities`       | Scoped activity identity, exercise reference, position, planned reps, load type/value, rest minutes        |
| `workout_sets`     | Scoped set identity, kind, position, status, feedback, actual reps, weight, timestamps                     |
| `exercises`        | ID, name, normalized-name key, load kind, barbell reference, 1RM, notes, deletion flag, position, revision |
| `barbells`         | ID, weight/unit, position                                                                                  |
| `plates`           | ID, weight/unit, quantity, position                                                                        |
| `exercise_presets` | Stable ID, name, load kind, position                                                                       |
| `muscle_labels`    | ID, exact label, normalized matching key                                                                   |
| `muscle_catalog`   | Position, muscle-label reference                                                                           |
| `exercise_muscles` | Exercise reference, muscle-label reference, position                                                       |
| `preset_muscles`   | Preset reference, muscle-label reference, position                                                         |

Saved exercises and presets remain separate. Presets are persisted user data and must not be replaced unconditionally with bundled defaults.

### Operational tables

| Table                  | Purpose                                                                |
| ---------------------- | ---------------------------------------------------------------------- |
| `schema_migrations`    | Ordered SQL schema history                                             |
| `bootstrap_state`      | Database identity, initialization/conversion state, dataset generation |
| `conversion_snapshots` | Immutable source payloads and provenance                               |
| `conversion_reports`   | Conversion outcome, ID mapping, repairs, counts, verification results  |
| `lifecycle_operations` | Restore/reset receipts and retryable external cleanup intent           |

### Field conventions

- Store valid timestamps as nullable integer epoch milliseconds.
- Store weights in their original units.
- Store percentage loads as fractions, preserving current semantics.
- Store rest in **minutes**.
- Preserve finite numeric values without introducing arbitrary integer or UI-range restrictions.
- Represent unrecoverable measurements as explicitly unknown, rather than inventing values.
- Use typed nullable fields for supported unknown states; keep raw source JSON in the migration archive, not normal domain rows.
- Preserve explicit array positions.
- Store content revisions needed to detect stale structural edits.

### Relationships

- Program → sessions → activities → sets: ownership foreign keys with cascading deletion.
- Saved exercise deletion remains soft.
- Activity exercise references may be null when conversion cannot resolve an original reference.
- Exercise barbell references may be null when equipment is unavailable.
- `templateId` becomes a lineage relationship, not a foreign key to a source session.
- A lineage does not require all its sessions to share a name or status.

Removing equipment must not delete exercises or historical workouts.

### Constraints

Enforce:

- Scoped identity uniqueness.
- Sibling position uniqueness.
- Valid domain enums and booleans.
- Complete-or-null optional weight pairs.
- Structural foreign keys.
- Active saved-exercise name uniqueness under the application's defined normalization.

Freeze and version the JavaScript name-normalization contract. SQLite `LOWER` or `NOCASE` must not silently replace existing Unicode/whitespace behavior.

### Index families

Create indexes supporting:

- Ordered programs and scoped entity lookup.
- Program session dates and history ranges.
- Program/lineage/status/position queries.
- Ready-session inactivity candidates.
- Ordered activities and repeated exercise occurrences.
- Reverse exercise usage.
- Set kind and position.
- Normalized exercise lookup.
- Muscle membership lookup.

Validate important queries with `EXPLAIN QUERY PLAN`. Add covering indexes where demonstrated query behavior justifies them.

## 6. Domain commands and behavioral preservation

Replace whole-object mutation APIs with intent-based commands.

Examples:

```text
createProgram
renameProgram
deleteProgram

createPlannedSession
saveSessionDraft
resetSession
deleteSession
completeSession
setSessionDeload

saveSetRecording
startSet
completeSetAndAdvance
reconcileTerminalSet

createExercise
editExercise
softDeleteExercise
restoreExercise
setExerciseNotes
setExerciseOneRepMax

replaceEquipment
restoreDefaultEquipment
replaceMuscleCatalog

restoreApplicationData
resetApplicationData
```

### Required transaction boundaries

Each of these is one transaction:

- Start a set and start its previously planned session.
- Complete a set and ready the next applicable set.
- Save a session and rename its lineage.
- Assign the first lineage to a source and create its new planned session.
- Finalize a session and its sets.
- Replace the muscle catalog and prune affected memberships.
- Restore the complete dataset.
- Reset application data and defaults.

### Existing semantics to retain

Explicit tests must protect:

- Terminal sessions are not reopened by ordinary stale updates.
- Incomplete-session acknowledgement uses current persisted content.
- Set recording edits respect terminal timing/status protections.
- Terminal-set reconciliation retains its deliberate lifecycle behavior.
- Set advancement remains within the correct activity.
- Reset retains the fields currently retained, including applicable weights, feedback, deload, and lineage.
- Template cloning regenerates activity/set IDs and resets execution state correctly.
- RPE weight inheritance differs from percentage-based planning.
- Repeated occurrences of an exercise remain distinct.
- Soft-deleted exercises remain available to historical references.
- Exercise attributes remain live references for existing workouts.
- Paired-weight calculations, unit conversion, and pending-set metrics retain existing meaning.
- Inactivity remains session-specific and uses existing fallback rules.
- Local-calendar, ordering, and tie-breaking behavior remain consistent.

Unrelated behavior corrections should be separately identified rather than hidden inside the migration.

### Stale-edit protection

Structural editor submissions carry:

- Dataset generation.
- Entity identity.
- Base content revision.
- Explicit changed fields or editing intent.

Commands validate against current state. A stale submission must either apply an explicitly safe field-level change or return a conflict while retaining the draft.

## 7. Queries, caching, and screen migration

### Read models

Provide immutable, purpose-built DTOs such as:

```text
ProgramSummary
ProgramOverview
SessionSummary
SessionDetail
SessionEditorSeed
SetExecutionContext
TemplateChoice
TemplatePlanningSource
ExerciseCatalog
ProgramInsights
ExerciseSeriesInsights
```

Use primitive timestamps in cached DTOs so unchanged results can retain identity.

### Screen migration inventory

Paths below are relative to `apps/expo/src/app/(public)/(app)/`.

| Screen family                             | Final data access                                                  |
| ----------------------------------------- | ------------------------------------------------------------------ |
| `index.tsx`                               | Program summaries and counts                                       |
| `program/settings`                        | Program summaries                                                  |
| `program/form`                            | Program header; create/rename/delete commands                      |
| `program/[programId]`                     | Week metadata and paginated session summaries                      |
| `program/[programId]/insights`            | Weekly/muscle aggregates                                           |
| `session/select`                          | Template choices and planning-source resolution                    |
| `program/[programId]/session/form`        | Bounded editor seed and targeted planning hints                    |
| `program/[programId]/session/[sessionId]` | One session plus policy/completion projections                     |
| Set execution screen                      | Selected set/activity context and transactional recording commands |
| Set insights screen                       | Compact lineage-series projections                                 |
| `exercise/settings` and `exercise/select` | Catalog/search projections and preset materialization              |
| `exercise/form`                           | Editor seed, usage existence, name checks, exercise commands       |
| `exercise/muscles`                        | Catalog and transactional membership updates                       |
| `load`                                    | Relevant exercise/load context                                     |
| `equipment`                               | Equipment projection and replacement commands                      |
| `support`                                 | Backup, restore, reset, conversion-report services                 |

Also replace root hydration gating and all non-screen store access.

### Timeline queries

- Load program headers/counts without activities or sets.
- Load history through bounded pages or date ranges.
- Compute calendar boundaries using existing local-calendar rules.
- Preserve stable ordering and collapse-state identities.
- Bound retained pages.
- Do not invalidate timeline grouping for set-only changes that cannot affect it.

### Analytics queries

- Calculate outside React render.
- Aggregate or stream compact facts rather than reconstruct historical session graphs.
- Resolve matching historical activities once.
- Preserve repeated-exercise occurrence and set-position semantics.
- Preserve missing points and calendar gaps.
- Mount charts lazily where their content is not yet visible.
- Keep complete historical results accessible.
- Preserve differences between existing program, exercise-series, and planning calculations.

Full-history analysis may legitimately scale with history. It should run on demand and should not be coupled to every current-workout interaction.

### Cache policy

Use TanStack Query with:

- Local queries and mutations operating independently of network connectivity.
- Explicit invalidation.
- Finite cache retention.
- No persisted query-cache mirror.
- No automatic mutation retry unless the command is demonstrably idempotent.
- Focused/foreground observers.
- Scoped cancellation and stale-result suppression.

Examples of invalidation boundaries:

| Mutation             | Relevant effects                                            |
| -------------------- | ----------------------------------------------------------- |
| Notes                | Exercise notes consumers                                    |
| Program rename       | Program labels and summaries                                |
| Warmup recording     | Relevant session/context and warmup history                 |
| Main-set recording   | Relevant session/context, lineage facts, applicable metrics |
| Exercise rename      | Labels and catalog/search                                   |
| 1RM/load-kind change | Relevant targets, planning, affected analytics              |
| Equipment change     | Equipment/load displays                                     |
| Reset/restore        | New dataset generation; discard old cache namespace         |

Hidden screens should retain UI state without keeping history calculations live.

## 8. Forms, autosave, and transient selections

### Form initialization

Mount each editor only after its complete seed resolves.

Key forms by dataset generation and edited entity/draft identity—not by fetch time, focus, or revision.

Background refresh must not reset dirty input.

### Save behavior

- Validate and capture an immutable submission.
- Await the command.
- Navigate only after commit.
- Prevent duplicate explicit submissions.
- Retain the draft on failure.
- Suppress stale navigation callbacks after unmount or generation changes.

Mutation completion remains service-owned if its originating component unmounts.

### Set autosave

- Keep decimal input strings local while editing.
- Submit field-scoped changes.
- Order recording saves, Start/Complete actions, and terminal reconciliation through the writer.
- Flush accepted edits at deliberate navigation/action boundaries.
- Do not rely solely on a delayed debounce or a background callback finishing before suspension.
- Do not reset user-entered weight when a target query refreshes.

### Modal selections

Retain transient coordination, scoped by:

- Dataset generation.
- Owning form instance.
- Request ID.
- Activity ID where relevant.

Return entity references and discriminated results instead of complete session graphs.

Consume a result once, only in its owning form. Clear stale requests after restore/reset.

### App lifecycle

- Stop presentation timers and periodic maintenance when backgrounded.
- On resume, perform due cleanup before exposing refreshed active-workout state.
- Keep elapsed-time ticking local; it must not cause SQL reads every second.
- Query only potentially expired Ready sessions.
- Refresh clock-sensitive projections when calendar context changes.

## 9. One-time conversion

### Supported source

Read the existing native keys asynchronously through `expo-sqlite/kv-store`:

```text
workout-storage
exercise-storage
activity-log-restore-transaction
```

This accesses the same native SDK key/value database currently used by the localStorage polyfill.

Do not initialize the old Zustand stores to obtain migration input. Importing those modules can hydrate and rewrite the source.

### Pure compatibility code

Extract and freeze:

- Legacy defaults.
- Envelope interpretation.
- Date revival.
- Workout migrations.
- Preset migrations.
- Equipment and muscle normalization.

Support the known current-storage layouts and persistence versions. Treat missing/non-numeric envelope versions according to their actual known behavior, rather than automatically treating them as version zero.

Unknown future formats require recovery rather than guessed conversion.

### Bootstrap states

```text
opening
  → inspecting
  → source-captured
  → converting
  → awaiting-verification
  → ready

or recovery-required
```

Database existence, schema existence, or nonempty tables do not establish readiness.

### Conversion sequence

1. **Gate ordinary application work.**
   No data-consuming routes, old hydration, cleanup timer, or normal writes.

2. **Inspect target authority.**
   A ready target wins. A committed target awaiting verification resumes verification. A retirement marker with a missing target requires recovery.

3. **Capture the legacy source.**
   Read both store payloads and the restore journal. Preserve exact bytes, key presence, source versions, hashes, and capture time.

4. **Resolve pending restore semantics.**
   The existing journal is an undo journal. A valid journal's pre-restore pair is authoritative. Select that coherent pair for conversion and retain the observed source/journal as evidence.

5. **Persist the immutable snapshot.**
   Retries use the captured source rather than replacing it with a new snapshot.

6. **Normalize and repair.**
   Produce the canonical target dataset, complete mapping/report, expected counts, and semantic digest.

7. **Populate atomically.**
   Insert all domain rows and the conversion receipt in one transaction. Batch prepared-statement execution without independently committing partial datasets.

8. **Commit as awaiting verification.**
   Normal use remains blocked.

9. **Verify through a fresh connection.**
   Check integrity, foreign keys, counts, identities, ordering, and semantic equivalence to the repaired expected dataset.

10. **Mark ready.**
    Commit the verified status separately.

11. **Establish retirement metadata.**
    Write a minimal external cutover receipt before accepting new user writes.

12. **Activate the application.**
    Start query services and ordinary lifecycle maintenance.

13. **Retire source payload keys.**
    Delete only known obsolete keys through retryable cleanup. Retain the migration archive according to policy.

### Verification requirements

Verify more than counts:

- Every valid source entity is accounted for.
- Parent/child ownership and order match.
- Deleted exercises and customized presets survive.
- Equipment values, units, and quantities match.
- Dates retain valid millisecond precision.
- Optional/unknown values match approved repairs.
- Lineages, statuses, and deload flags match.
- No duplicate import occurred.

Run inactivity cleanup **after conversion equivalence is established**, as a separate SQL domain command. Conversion itself should not obscure domain changes.

### Restart behavior

| Durable state                                 | Restart behavior                                         |
| --------------------------------------------- | -------------------------------------------------------- |
| Source captured; population uncommitted       | Retry from immutable snapshot                            |
| Population committed; verification incomplete | Verify target                                            |
| Ready target; retirement incomplete           | Complete retirement; use target                          |
| Ready target intentionally reset              | Use reset dataset                                        |
| Missing/corrupt target after cutover          | Recovery; no stale automatic reimport                    |
| Unsupported newer schema                      | Upgrade-required state                                   |
| Source unreadable                             | Retry/recovery; never interpret as an empty installation |

## 10. Repair policy and report

Repairs must be deterministic and versioned. Retrying the same snapshot must produce the same identities and values.

### Proposed repair rules

| Source problem                             | Treatment                                                                             |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| Duplicate ID within its ownership scope    | Preserve the authoritative occurrence; deterministically remap subsequent occurrences |
| Empty/malformed ID                         | Generate a deterministic replacement                                                  |
| Duplicate active exercise name             | Preserve first; deterministically suffix conflicting names                            |
| Missing exercise reference                 | Preserve activity and sets; mark reference unavailable                                |
| Missing barbell reference                  | Clear unavailable reference                                                           |
| Numeric string                             | Convert when nonblank and finite                                                      |
| Invalid measurement                        | Represent as unknown; retain original in report/archive                               |
| Invalid timestamp                          | Clear unrecoverable value; preserve valid legacy-revived instants                     |
| Unknown status                             | Conservatively mark Incomplete and report                                             |
| Unknown feedback                           | Neutral and report                                                                    |
| Set type/array mismatch                    | Containing array determines kind                                                      |
| Missing deload                             | False, matching existing normalization                                                |
| Malformed record with recoverable children | Preserve recoverable structure; report exact treatment                                |
| Uninterpretable fragments                  | Quarantine with source location and accounting                                        |

Do not fabricate weights, reps, exercise attributes, or timestamps.

Preserve valid historical values even when outside current UI ranges. Flag suspicious chronology rather than guessing which valid timestamp is wrong.

### Duplicate-reference resolution

The current application inconsistently resolves some duplicate exercise IDs: editing commonly uses the first occurrence, while some analytics use the last.

The repaired datastore will resolve references consistently, using the first occurrence. Retain other exercises under repaired IDs and report affected references.

Similarly, eliminate duplicate-set ambiguity through deterministic remapping.

### Unknown values in the final application

- Display unavailable exercise references clearly.
- Allow users to correct recovered records.
- Exclude unknown-dependent calculations from totals and identify partial results.
- Preserve recorded history when resolving a recovered reference.
- Keep canonical fields typed and nullable; avoid runtime raw-JSON interpretation.

### Report contents

Include:

- Converter version and timestamps.
- Source envelope versions.
- Source and resulting counts.
- Complete identity mapping.
- Repairs with source location, original value, replacement, and reason.
- Quarantined fragments.
- Verification outcome.
- Records still requiring review.

Show a summary after successful conversion and make the report accessible/exportable through Support.

### Exceptional blocking conditions

Automatic repair does not justify inventing an unknown hierarchy.

Block activation for malformed/truncated payloads, unknown future formats, uninterpretable root structures, unresolved malformed restore journals, failed integrity verification, or storage failures.

Provide retry and recovery-data export without silently opening an empty application.

### Retention default

Proposed default:

- Retain the original snapshot and detailed report for **30 days after verified conversion**.
- Allow export and earlier deletion.
- Preserve compact conversion/retirement metadata afterward.
- Never expire an unverified snapshot.
- Full Reset removes retained content immediately and preserves only control metadata needed to prevent reimport.

## 11. Backup, restore, reset, and deletion

### Portable backup format

Keep portable backups independent of SQLite tables and schema versions.

- Retain the official **version-1 reader**.
- Define frozen backup DTOs independent of evolving runtime types.
- Introduce a **version-2 writer** for the final canonical model, including explicit unknown/recovered states and stable preset identities.
- Use domain-oriented data names instead of live storage-key names.
- Include programs, workouts, saved exercises, presets, equipment, and muscles.
- Exclude operational caches and internal database control tables.

A backup version changes because the portable model changes—not merely because SQLite is used.

### Export

- Read a consistent dataset snapshot.
- Preserve ordering.
- Validate the portable representation.
- Serialize/share outside write transactions.
- Provide progress for large datasets.
- Test native Files/cloud-provider flows and cancellation.

### Restore

1. Read and parse the selected versioned backup.
2. Validate and prepare any repair report.
3. Confirm replacement.
4. Acquire a dataset-replacement barrier.
5. Complete already accepted writes and block new ones.
6. Replace domain data in one transaction.
7. Preserve initialization/schema authority.
8. Advance dataset generation.
9. Clear stale caches, selections, forms, and navigation.
10. Publish the new dataset after commit.

A failed restore leaves the previous domain dataset unchanged.

### Reset

Reset in one transaction:

- Remove user domain data.
- Restore agreed equipment, muscle, and preset defaults.
- Delete retained conversion content.
- Advance dataset generation.
- Preserve initialization and retirement control metadata.

Then complete retryable cleanup of external legacy payloads and app-owned temporary artifacts.

Deleting the database file is not the reset mechanism.

### Deletion

Preserve existing ownership and soft-delete behavior. Do not remove lineage siblings or historical workouts when deleting their referenced exercise.

## 12. Verification and performance acceptance

### Unit tests

Cover:

- Supported source versions and envelope variations.
- Missing versus intentionally empty data.
- Legacy muscle/default behavior.
- Deterministic repair and ID mapping.
- Date and numeric conversion.
- Ordering and repeated exercise occurrences.
- Workout lifecycle, reset, planning, deload, and analytics parity.
- Backup versions and repair-report accounting.

### Real SQLite integration tests

Run the actual schema, repositories, and commands against a real SQLite engine. A small driver adapter to Node's `node:sqlite` can support host tests.

Cover:

- Foreign-key enforcement on the actual writer path.
- Transaction rollback.
- Consistent multi-query reads.
- Restore/reset atomicity.
- Stale-generation rejection.
- Revision conflicts.
- Old reads completing after writes.
- Reader/writer cleanup after errors.
- Query plans and query counts.

Mocked SQL strings or Expo's server-runtime stubs are insufficient.

### Native upgrade and fault tests

Run on both iOS and Android:

- Upgrade an existing populated installation using the same app identifier/container.
- Terminate during capture, insertion, commit, verification, and retirement.
- Restart after each interruption.
- Exercise storage failures, locked database, and malformed source.
- Reset and restart while legacy artifacts remain physically present.
- Restore while stale forms and modal requests exist.
- Test backup picking/sharing and cancellation.
- Verify foreground/background behavior.

### Performance datasets

Use reproducible sanitized fixtures at approximately:

- Small: 10 sessions.
- Representative: 500–1,000 sessions and tens of thousands of sets.
- Stress: at least 100,000 sets.

Keep the active workout identical across sizes.

### Acceptance contracts

- No ordinary mutation serializes complete history.
- Current-set commands touch bounded records.
- Program lists load summaries rather than nested workouts.
- No per-row N+1 detail reads.
- Hidden screens initiate no automatic history recomputation.
- Notes do not invalidate analytics.
- Cleanup targets active candidates.
- Cache/page retention is bounded.
- Full historical insights remain available.

On named reference devices, target:

- Common bounded queries/writes: **p95 ≤100 ms**.
- Immediate interaction feedback independent of database completion.
- No history-sized JS long tasks during ordinary interactions.
- Normal database readiness and initial reads: **≤2 seconds**, excluding one-time conversion.
- Conversion: measured time/memory budgets, visible progress, restart safety, and no OS termination at supported scale.

Treat these as proposed release budgets to validate on hardware, not existing measurements.

### Required checks

From the repository root, using the configured Node and pnpm versions:

```bash
pnpm --filter @activity-log/expo lint
pnpm --filter @activity-log/expo format
pnpm --filter @activity-log/expo typecheck
pnpm --filter @activity-log/expo test

pnpm --filter @activity-log/ui lint
pnpm --filter @activity-log/ui format
pnpm --filter @activity-log/ui typecheck
pnpm --filter @activity-log/ui test
```

Native integration, upgrade, crash, and performance verification are additional release gates.

## 13. Ordered implementation tasks

1. [ ] **Freeze the migration specification and fixtures.**
       Record supported source formats, canonical behavior, repair rules, report format, and representative historical datasets.

2. [ ] **Define final domain and portable-backup contracts.**
       Specify scoped identities, unknown states, read models, commands, errors, revisions, generation handling, and backup v2.

3. [ ] **Extract side-effect-free defaults and legacy compatibility functions.**
       Freeze conversion behavior without importing persisted stores.

4. [ ] **Add the final data-layer dependencies and driver boundary.**
       Configure TanStack Query and the real-SQLite host-test adapter.

5. [ ] **Implement connection ownership and transaction scheduling.**
       Verify PRAGMAs, foreign keys, failure cleanup, and reader snapshot consistency.

6. [ ] **Implement schema version 1 and required indexes.**
       Include operational metadata, archive/report tables, constraints, and migration history.

7. [ ] **Implement typed repositories.**
       Cover scoped identities, ordered children, settings, presets, and explicit unavailable references.

8. [ ] **Implement the pure converter and deterministic repair engine.**
       Produce canonical data, mappings, counts, reports, and semantic verification manifests.

9. [ ] **Implement legacy source capture and restore-journal interpretation.**
       Use asynchronous access to the existing native key/value database.

10. [ ] **Implement atomic population and fresh-connection verification.**
        Include restart handling for every bootstrap state.

11. [ ] **Implement retirement receipts and retained-data cleanup.**
        Ensure ready or reset installations cannot reimport stale legacy data.

12. [ ] **Implement transactional workout and settings commands.**
        Preserve lifecycle, planning, completion, deletion, and no-op/error semantics.

13. [ ] **Implement bounded queries and analytics projections.**
        Include timelines, template choices, planning hints, usage checks, and complete insight series.

14. [ ] **Implement cache publication and lifecycle control.**
        Add scoped invalidation, stale-read protection, focused observers, and generation boundaries.

15. [ ] **Implement asynchronous form-controller patterns.**
        Protect drafts, revisions, explicit saves, recording autosave, and navigation ordering.

16. [ ] **Replace startup hydration with the bootstrap boundary.**
        Add conversion progress, actionable recovery, and readiness gating.

17. [ ] **Migrate program screens.**
        Dashboard, management, program form, and paginated program history.

18. [ ] **Migrate exercise and settings screens.**
        Catalog, picker, editor, load, equipment, muscles, and recovered-record handling.

19. [ ] **Migrate template selection and session editing.**
        Include scoped modal results, planning sources, lineage saves, reset, and conflict handling.

20. [ ] **Migrate session and set execution.**
        Include atomic Start/Complete/Advance and ordered recording/reconciliation.

21. [ ] **Migrate insights.**
        Use repository projections, preserve calculations, and lazily mount chart content.

22. [ ] **Implement final backup, restore, reset, and report access.**
        Retain backup-v1 import and verify replacement barriers and artifact cleanup.

23. [ ] **Remove the obsolete runtime data architecture.**
        Remove persisted workout/preset stores, hydration flags, old store types, direct snapshots, and import-time recovery side effects.

24. [ ] **Complete automated parity, concurrency, and fault tests.**
        Verify actual SQL behavior, conversion accounting, stale-result handling, and command failure recovery.

25. [ ] **Complete scale and performance verification.**
        Measure representative devices, query plans/counts, latency, memory, frames, and WAL behavior.

26. [ ] **Configure the release/runtime boundary and Android delivery.**
        Ensure compatible native artifacts and rollback candidates for both platforms.

27. [ ] **Rehearse real in-place upgrades and native lifecycle operations.**
        Use populated prior installations, process termination, restore, reset, Files/cloud providers, and restart.

28. [ ] **Run all required checks and review release evidence.**
        Record exact commands/results and resolve failures.

29. [ ] **Ship the complete cutover release.**
        Every application data consumer uses the final SQLite architecture.

## 14. Release and completion criteria

The current runtime version derives from major/minor app version, so patch releases share a runtime.

Ship this migration under a new minor/major runtime boundary with SQLite-aware code embedded in the native builds. Any rollback candidate for that runtime must understand the new datastore.

The current delivery workflows target iOS; Android delivery and verification must be included before this release is complete.

### Done means

- Both native platforms pass in-place upgrade testing.
- Existing data converts once and verifies before activation.
- Repairs are deterministic, accounted for, and reviewable.
- No valid workout history is silently discarded.
- Backup-v1 import and backup-v2 round trips pass.
- Restore/reset are atomic.
- Reset cannot resurrect legacy data.
- Every route uses final queries and commands.
- No persisted whole-history Zustand state remains.
- Representative large-history performance meets agreed budgets.
- All package checks and native release gates pass.

**Implementation status:** foundational schema, connection and transaction infrastructure, and legacy-source parsing have been started. Conversion, application cutover, and release verification remain incomplete; the existing persisted stores remain authoritative.
