import { z } from "zod";

/** The version new backups are written with. */
export const PORTABLE_BACKUP_VERSION = 4;

/** Frozen portable model. Timestamps are epoch milliseconds, never Date objects. */
const id = z.string().refine((value) => value.trim().length > 0);
const numeric = z.number().finite();
const validTimestamp = numeric
  .int()
  .refine((value) => Number.isFinite(new Date(value).getTime()));
const timestamp = validTimestamp.nullable();
const unit = z.enum(["lbs", "kg"]);
const weight = z.object({ value: numeric, unit }).nullable();
const status = z.enum(["Planned", "Ready", "Done", "Incomplete"]);
const loadKind = z.enum(["BARBELL", "WEIGHT_PAIR", "SINGLE_WEIGHT"]).nullable();
const workoutSet = z.object({
  id,
  status,
  feedback: z.enum(["Easy", "Neutral", "Hard"]),
  actualReps: numeric.nullable(),
  weight,
  startMs: timestamp,
  endMs: timestamp,
});
const activityFields = {
  id,
  exerciseId: id.nullable(),
  reps: numeric.nullable(),
  load: z
    .object({ type: z.enum(["PERCENT", "RPE"]), value: numeric })
    .nullable(),
  restMinutes: numeric.nullable(),
  warmupSets: z.array(workoutSet),
  mainSets: z.array(workoutSet),
};
const alternative = z.object(activityFields);
/** Version 3 added alternatives; version-2 backups have none. */
const supersetMember = z.object({
  ...activityFields,
  alternatives: z.array(alternative).default([]),
});
/**
 * Version 4 added superset members, performed alternately with their activity;
 * older backups have none. Older apps reject version 4 rather than drop them.
 */
const activity = supersetMember.extend({
  supersets: z.array(supersetMember).default([]),
});
const session = z.object({
  id,
  lineageId: id.nullable(),
  name: z.string(),
  status,
  deload: z.boolean(),
  startMs: timestamp,
  endMs: timestamp,
  lastActivityAtMs: timestamp,
  activities: z.array(activity),
});
const exercise = z.object({
  id,
  name: z.string(),
  loadKind,
  barbellId: id.nullable(),
  oneRepMax: weight,
  notes: z.string().nullable(),
  deleted: z.boolean(),
  primaryMuscles: z.array(z.string()),
});
const preset = z.object({
  id,
  name: z.string(),
  loadKind,
  primaryMuscles: z.array(z.string()),
});
export const portableBackupV2Schema = z.object({
  format: z.literal("activity-log-tracker-backup"),
  version: z.union([
    z.literal(2),
    z.literal(3),
    z.literal(PORTABLE_BACKUP_VERSION),
  ]),
  createdAtMs: validTimestamp,
  data: z.object({
    programs: z.array(
      z.object({
        id,
        name: z.string(),
        lineages: z.array(id),
        sessions: z.array(session),
      }),
    ),
    exercises: z.array(exercise),
    presets: z.array(preset),
    equipment: z.object({
      barbells: z.array(z.object({ id, value: numeric, unit })),
      plates: z.array(
        z.object({ id, value: numeric, unit, quantity: numeric }),
      ),
    }),
    muscleGroups: z.array(z.string()),
  }),
});

export type PortableBackupV2 = z.infer<typeof portableBackupV2Schema>;
export type PortableDataV2 = PortableBackupV2["data"];

export function serializePortableBackupV2(
  data: PortableDataV2,
  createdAtMs: number,
): string {
  const backup = portableBackupV2Schema.parse({
    format: "activity-log-tracker-backup",
    version: PORTABLE_BACKUP_VERSION,
    createdAtMs,
    data,
  });
  return JSON.stringify(backup, null, 2);
}

export function parsePortableBackupV2(contents: string): PortableBackupV2 {
  return portableBackupV2Schema.parse(JSON.parse(contents) as unknown);
}
