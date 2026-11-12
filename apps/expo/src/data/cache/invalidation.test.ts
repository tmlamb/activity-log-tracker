import { describe, expect, it } from "vitest";

import { invalidateWorkoutChange } from "./invalidation";
import { workoutKeys } from "./keys";
import { createWorkoutQueryClient } from "./query-client";

describe("workout cache invalidation", () => {
  it("invalidates a main-set's dependent projections without touching program counts or other sessions", async () => {
    const client = createWorkoutQueryClient();
    const generation = 1;
    const changed = [
      workoutKeys.sessionDetail(generation, "p", "s"),
      [...workoutKeys.setContexts(generation, "p", "s"), "a", "set"],
      [...workoutKeys.exerciseSeries(generation, "p"), "exercise"],
      workoutKeys.programInsights(generation, "p"),
    ];
    const unchanged = [
      workoutKeys.programs(generation),
      workoutKeys.timeline(generation, "p"),
      workoutKeys.sessionDetail(generation, "p", "other"),
      workoutKeys.programInsights(generation, "other"),
      workoutKeys.sessionDetail(2, "p", "s"),
    ];
    [...changed, ...unchanged].forEach((key) =>
      client.setQueryData(key, "cached"),
    );
    await invalidateWorkoutChange(client, {
      type: "set-recording",
      generation,
      programId: "p",
      sessionId: "s",
      kind: "Main",
    });
    changed.forEach((key) =>
      expect(client.getQueryState(key)?.isInvalidated).toBe(true),
    );
    unchanged.forEach((key) =>
      expect(client.getQueryState(key)?.isInvalidated).toBe(false),
    );
    client.clear();
  });

  it("does not invalidate main-set analytics for warmups or notes", async () => {
    const client = createWorkoutQueryClient();
    const metrics = workoutKeys.programInsights(1, "p");
    const notes = workoutKeys.exerciseNotes(1, "e");
    client.setQueryData(metrics, "metrics");
    client.setQueryData(notes, "notes");
    await invalidateWorkoutChange(client, {
      type: "set-recording",
      generation: 1,
      programId: "p",
      sessionId: "s",
      kind: "Warmup",
    });
    expect(client.getQueryState(metrics)?.isInvalidated).toBe(false);
    await invalidateWorkoutChange(client, {
      type: "exercise-notes",
      generation: 1,
      exerciseId: "e",
    });
    expect(client.getQueryState(notes)?.isInvalidated).toBe(true);
    expect(client.getQueryState(metrics)?.isInvalidated).toBe(false);
    client.clear();
  });

  it("cancels an older in-flight read so it cannot publish after a committed change", async () => {
    const client = createWorkoutQueryClient();
    const key = workoutKeys.sessionDetail(1, "p", "s");
    let resolve: ((value: string) => void) | undefined;
    const oldResult = new Promise<string>((finish) => {
      resolve = finish;
    });
    const oldQuery = client
      .fetchQuery({ queryKey: key, queryFn: () => oldResult })
      .catch(() => undefined);
    await invalidateWorkoutChange(client, {
      type: "set-recording",
      generation: 1,
      programId: "p",
      sessionId: "s",
      kind: "Main",
    });
    client.setQueryData(key, "new");
    resolve?.("old");
    await oldQuery;
    expect(client.getQueryData(key)).toBe("new");
    client.clear();
  });
});
