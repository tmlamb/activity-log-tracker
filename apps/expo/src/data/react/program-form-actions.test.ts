import { describe, expect, it, vi } from "vitest";

import { createProgramFormActions } from "./program-form-actions";

describe("program form actions", () => {
  it("prevents duplicate submissions, waits for commit, and reuses the draft ID", async () => {
    let finish: (() => void) | undefined;
    const commit = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const service = {
      createProgram: vi.fn(() => commit),
      renameProgram: vi.fn(),
      deleteProgram: vi.fn(),
    };
    const actions = createProgramFormActions(service, undefined, "draft-id");
    const first = actions.save("My draft");
    expect(await actions.save("Another submission")).toEqual({
      status: "busy",
    });
    expect(await actions.remove()).toEqual({ status: "busy" });
    expect(service.createProgram).toHaveBeenCalledExactlyOnceWith(
      "draft-id",
      "My draft",
    );
    finish?.();
    expect(await first).toEqual({ status: "committed" });
    expect(await actions.save("Retry")).toEqual({ status: "committed" });
    expect(service.createProgram).toHaveBeenLastCalledWith("draft-id", "Retry");
  });

  it("reports failures and remains usable without mutating the caller's draft", async () => {
    const error = new Error("disk full");
    const service = {
      createProgram: vi.fn(),
      renameProgram: vi
        .fn()
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(undefined),
      deleteProgram: vi.fn().mockResolvedValue(undefined),
    };
    const actions = createProgramFormActions(service, "existing", "unused");
    const draft = { name: "Edited program" };
    expect(await actions.save(draft.name)).toEqual({ status: "failed", error });
    expect(draft.name).toBe("Edited program");
    expect(await actions.save(draft.name)).toEqual({ status: "committed" });
    expect(service.renameProgram).toHaveBeenCalledWith(
      "existing",
      "Edited program",
    );
    expect(await actions.remove()).toEqual({ status: "committed" });
    expect(service.deleteProgram).toHaveBeenCalledExactlyOnceWith("existing");
  });
});
