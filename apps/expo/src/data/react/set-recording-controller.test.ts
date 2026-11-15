import { describe, expect, it, vi } from "vitest";

import { createSetRecordingController } from "./set-recording-controller";

const reference = {
  programId: "p",
  sessionId: "s",
  activityId: "a",
  setId: "set",
};

describe("set recording save controller", () => {
  it("serializes edits and preserves the newest field value", async () => {
    let release: (() => void) | undefined;
    const first = new Promise<void>((resolve) => {
      release = resolve;
    });
    const patchSet = vi
      .fn()
      .mockImplementationOnce(() => first)
      .mockResolvedValue(true);
    const controller = createSetRecordingController(
      { patchSet, setExerciseNotes: vi.fn().mockResolvedValue(undefined) },
      reference,
      "e",
    );
    controller.change({ actualReps: 5 });
    await Promise.resolve();
    controller.change({ actualReps: 6 });
    release?.();
    await controller.flush();
    expect(patchSet).toHaveBeenNthCalledWith(1, reference, { actualReps: 5 });
    expect(patchSet).toHaveBeenLastCalledWith(reference, { actualReps: 6 });
  });

  it("retains failed field and note edits for a later explicit retry", async () => {
    const patchSet = vi
      .fn()
      .mockRejectedValueOnce(new Error("disk full"))
      .mockRejectedValueOnce(new Error("disk full"))
      .mockResolvedValue(true);
    const setExerciseNotes = vi.fn().mockResolvedValue(undefined);
    const controller = createSetRecordingController(
      { patchSet, setExerciseNotes },
      reference,
      "e",
    );
    controller.change({ weight: { value: 42.5, unit: "kg" } });
    await expect(controller.flush()).rejects.toThrow("disk full");
    controller.changeNotes("remember");
    await controller.flush();
    expect(patchSet).toHaveBeenLastCalledWith(reference, {
      weight: { value: 42.5, unit: "kg" },
    });
    expect(setExerciseNotes).toHaveBeenCalledWith("e", "remember");
  });
});
