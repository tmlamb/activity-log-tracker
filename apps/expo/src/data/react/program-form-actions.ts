import type { ApplicationDataSnapshot } from "../application-runtime";

type ProgramService = Pick<
  ApplicationDataSnapshot["service"],
  "createProgram" | "renameProgram" | "deleteProgram"
>;
export type ProgramActionResult =
  | { status: "committed" }
  | { status: "busy" }
  | { status: "failed"; error: unknown };

/** Single-flight actions retain the caller's draft on failure. */
export function createProgramFormActions(
  service: ProgramService,
  programId: string | undefined,
  newProgramId: string,
) {
  let pending = false;
  async function run(
    job: () => Promise<unknown>,
  ): Promise<ProgramActionResult> {
    if (pending) return { status: "busy" };
    pending = true;
    try {
      await job();
      return { status: "committed" };
    } catch (error) {
      return { status: "failed", error };
    } finally {
      pending = false;
    }
  }
  return {
    save: (name: string) =>
      run(() =>
        programId
          ? service.renameProgram(programId, name)
          : service.createProgram(newProgramId, name),
      ),
    remove: () =>
      run(() =>
        programId
          ? service.deleteProgram(programId)
          : Promise.reject(new Error("Program not found.")),
      ),
  };
}
