import type { ApplicationDataSnapshot } from "../application-runtime";
import type { SetRecordingPatch, SetReference } from "../repositories/sets";

type Service = Pick<
  ApplicationDataSnapshot["service"],
  "patchSet" | "setExerciseNotes"
>;

/** Ordered, field-scoped saves retain failed edits until an explicit flush succeeds. */
export function createSetRecordingController(
  service: Service,
  reference: SetReference,
  exerciseId: string | null,
) {
  let sequence = 0;
  let pending: { patch: SetRecordingPatch; versions: Record<string, number> } =
    { patch: {}, versions: {} };
  let notes: { value: string | null; version: number } | null = null;
  let lastError: unknown;
  let chain: Promise<void> = Promise.resolve();

  async function persist() {
    const patch = { ...pending.patch };
    const versions = { ...pending.versions };
    const submittedNotes = notes;
    try {
      if (Object.keys(patch).length) {
        await service.patchSet(reference, patch);
        for (const key of Object.keys(
          versions,
        ) as (keyof SetRecordingPatch)[]) {
          if (pending.versions[key] === versions[key]) {
            delete pending.patch[key];
            delete pending.versions[key];
          }
        }
      }
      if (submittedNotes && exerciseId) {
        await service.setExerciseNotes(exerciseId, submittedNotes.value);
        if (notes?.version === submittedNotes.version) notes = null;
      }
      lastError = undefined;
    } catch (error) {
      lastError = error;
    }
  }
  function schedule() {
    chain = chain.then(persist);
  }
  return {
    change: (patch: SetRecordingPatch) => {
      for (const key of Object.keys(patch) as (keyof SetRecordingPatch)[]) {
        pending = {
          patch: { ...pending.patch, [key]: patch[key] },
          versions: { ...pending.versions, [key]: ++sequence },
        };
      }
      schedule();
    },
    changeNotes: (value: string | null) => {
      if (!exerciseId) return;
      notes = { value, version: ++sequence };
      schedule();
    },
    flush: async () => {
      await chain;
      if (Object.keys(pending.patch).length || notes) {
        schedule();
        await chain;
      }
      if (Object.keys(pending.patch).length || notes)
        throw lastError instanceof Error
          ? lastError
          : new Error("Workout changes could not be saved.");
    },
  };
}
