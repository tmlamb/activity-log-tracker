import { InfiniteQueryObserver } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

import type { ApplicationDataSnapshot } from "../application-runtime";
import type { TimelineCursor } from "../domain/program-timeline";
import { invalidateWorkoutChange } from "../cache/invalidation";
import { createWorkoutQueryClient } from "../cache/query-client";
import { programWeekQueryOptions } from "./program-queries";

vi.mock("expo-router/react-navigation", () => ({ useIsFocused: () => true }));

describe("program timeline page cache", () => {
  it("keeps a cached first page visible while invalidating its cursors", async () => {
    const cache = createWorkoutQueryClient();
    const snapshot = {
      generation: 5,
      service: { programWeek: vi.fn() },
    } as unknown as ApplicationDataSnapshot;
    const options = programWeekQueryOptions(snapshot, "p", 1, 100, 1);
    const summary = (id: string) => ({
      id,
      name: id,
      lineageId: null,
      status: "Done" as const,
      deload: false,
      startMs: 100,
      endMs: 200,
      day: 1,
    });
    const first = { week: 1, items: [summary("first")], nextCursor: null };
    const later = { week: 1, items: [summary("later")], nextCursor: null };
    cache.setQueryData(options.queryKey, {
      pages: [first, later],
      pageParams: [undefined, { position: 1 }],
    });
    try {
      await invalidateWorkoutChange(cache, {
        type: "session-lifecycle",
        generation: 5,
        programId: "p",
        sessionId: "s",
      });
      expect(cache.getQueryData(options.queryKey)).toEqual({
        pages: [first],
        pageParams: [undefined],
      });
      expect(cache.getQueryState(options.queryKey)?.isInvalidated).toBe(true);
    } finally {
      cache.clear();
    }
  });

  it("bounds retained pages and can restart at the first page", async () => {
    const cache = createWorkoutQueryClient();
    const programWeek = vi.fn(
      (_programId: string, request: { after?: TimelineCursor }) => {
        const index = request.after?.position ?? 0;
        return Promise.resolve({
          week: 1,
          items: [
            {
              id: `s${index}`,
              name: `Session ${index}`,
              lineageId: null,
              status: "Done" as const,
              deload: false,
              startMs: 100,
              endMs: 200,
              day: 1,
            },
          ],
          nextCursor:
            index < 4
              ? {
                  programStartMs: 100,
                  currentWeek: 1,
                  week: 1,
                  windowStartMs: 0,
                  windowEndMs: 1000,
                  group: 2,
                  undated: 0,
                  sortStartMs: 100,
                  position: index + 1,
                }
              : null,
        });
      },
    );
    const snapshot = {
      generation: 5,
      service: { programWeek },
    } as unknown as ApplicationDataSnapshot;
    const options = programWeekQueryOptions(snapshot, "p", 1, 100, 1);
    const observer = new InfiniteQueryObserver(cache, options);
    const unsubscribe = observer.subscribe(() => undefined);
    const hiddenOptions = programWeekQueryOptions(snapshot, "p", 0, 100, 1);
    const hiddenObserver = new InfiniteQueryObserver(cache, {
      ...hiddenOptions,
      enabled: false,
    });
    const unsubscribeHidden = hiddenObserver.subscribe(() => undefined);
    try {
      await vi.waitFor(() =>
        expect(observer.getCurrentResult().data?.pages).toHaveLength(1),
      );
      for (let index = 0; index < 3; index++) await observer.fetchNextPage();
      expect(
        observer
          .getCurrentResult()
          .data?.pages.map((page) => page.items[0]?.id),
      ).toEqual(["s1", "s2", "s3"]);
      expect(observer.getCurrentResult().data?.pageParams[0]).toMatchObject({
        position: 1,
      });
      cache.setQueryData(
        hiddenOptions.queryKey,
        observer.getCurrentResult().data,
      );
      await invalidateWorkoutChange(cache, {
        type: "set-recording",
        generation: 5,
        programId: "p",
        sessionId: "s",
        kind: "Main",
      });
      expect(
        observer
          .getCurrentResult()
          .data?.pages.map((page) => page.items[0]?.id),
      ).toEqual(["s1", "s2", "s3"]);
      const callsBeforeLifecycle = programWeek.mock.calls.length;
      await invalidateWorkoutChange(cache, {
        type: "session-lifecycle",
        generation: 5,
        programId: "p",
        sessionId: "s",
      });
      expect(
        observer
          .getCurrentResult()
          .data?.pages.map((page) => page.items[0]?.id),
      ).toEqual(["s0"]);
      expect(programWeek).toHaveBeenCalledTimes(callsBeforeLifecycle + 1);
      expect(cache.getQueryData(hiddenOptions.queryKey)).toBeUndefined();
      for (let index = 0; index < 3; index++) await observer.fetchNextPage();
      await cache.resetQueries({ queryKey: options.queryKey, exact: true });
      expect(
        observer
          .getCurrentResult()
          .data?.pages.map((page) => page.items[0]?.id),
      ).toEqual(["s0"]);
      expect(observer.getCurrentResult().data?.pageParams[0]).toBeUndefined();
    } finally {
      unsubscribe();
      unsubscribeHidden();
      cache.clear();
    }
  });
});
