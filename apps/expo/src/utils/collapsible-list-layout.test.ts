import { describe, expect, it, vi } from "vitest";

import type { ListLayoutSnapshot } from "./collapsible-list-layout";
import { createCollapsibleListLayout } from "./collapsible-list-layout";

const itemKeys = Array.from({ length: 600 }, (_, index) => `week-${index}`);
const snapshot: ListLayoutSnapshot = {
  itemKeys,
  startBuffered: 195,
  endBuffered: 210,
  scrollLength: 800,
  previousHeight: 40,
};
const collapsedSize = { height: 40, width: 350 };
const expandedSize = { height: 340, width: 350 };

describe("collapsible list layout", () => {
  it("retains moving rows, then reports only the endpoint size before committing the reveal", () => {
    const layout = createCollapsibleListLayout();
    const events: string[] = [];
    let transitionId = 0;
    layout.prepare(
      "week-200",
      expandedSize,
      (id) => {
        transitionId = id;
        events.push("reveal");
      },
      snapshot,
    );

    expect(events).toEqual([]);
    expect(layout.snapshot().retainedKeys).toEqual(
      expect.arrayContaining(itemKeys.slice(195, 211)),
    );
    expect(layout.snapshot().retainedKeys).toHaveLength(16);

    const updateSize = vi.fn((key, size) => {
      expect(key).toBe("week-200");
      expect(size).toEqual(expandedSize);
      events.push("size");
    });
    layout.commitPending(updateSize);
    // Repeated scheduling must never recommit a transition.
    for (let frame = 0; frame < 40; frame++) layout.commitPending(updateSize);

    expect(events).toEqual(["size", "reveal"]);
    expect(updateSize).toHaveBeenCalledTimes(1);
    expect(layout.snapshot().animating).toBe(true);
    layout.finish(transitionId);
    expect(layout.snapshot().retainedKeys).toEqual([]);
  });

  it("mounts incoming rows before a tall collapse without mounting the entire history", () => {
    const layout = createCollapsibleListLayout();
    layout.prepare("week-200", collapsedSize, vi.fn(), {
      ...snapshot,
      endBuffered: 200,
      previousHeight: 12_000,
    });

    const { retainedKeys } = layout.snapshot();
    expect(retainedKeys).toContain("week-200");
    expect(retainedKeys).toContain("week-240");
    expect(retainedKeys.length).toBeLessThan(60);
    expect(retainedKeys).not.toContain("week-599");
  });

  it("cancels a queued expansion when the user closes it before the window is ready", () => {
    const layout = createCollapsibleListLayout();
    const open = vi.fn();
    const close = vi.fn();
    const updateSize = vi.fn();
    layout.prepare("week-200", expandedSize, open, snapshot);
    layout.prepare("week-200", collapsedSize, close, snapshot);
    layout.commitPending(updateSize);

    expect(open).not.toHaveBeenCalled();
    expect(close).toHaveBeenCalledWith(0);
    expect(updateSize).not.toHaveBeenCalled();
    expect(layout.snapshot().retainedKeys).toEqual([]);
  });

  it("prewarms the incoming upper viewport for bottom clamping with bounded retention", () => {
    const layout = createCollapsibleListLayout();
    layout.prepare("week-599", collapsedSize, vi.fn(), {
      ...snapshot,
      startBuffered: 585,
      endBuffered: 599,
      previousHeight: 12_000,
      scrollAdjustment: 12_000,
    });
    const { retainedKeys } = layout.snapshot();
    expect(retainedKeys).toContain("week-550");
    expect(retainedKeys).toContain("week-599");
    expect(retainedKeys.length).toBeLessThan(60);
    expect(retainedKeys).not.toContain("week-0");
  });

  it("keeps a reversal's rows mounted when the interrupted animation completes", () => {
    const layout = createCollapsibleListLayout();
    let openingId = 0;
    let closingId = 0;
    layout.prepare(
      "week-200",
      expandedSize,
      (id) => {
        openingId = id;
      },
      snapshot,
    );
    layout.commitPending(vi.fn());
    layout.prepare(
      "week-200",
      collapsedSize,
      (id) => {
        closingId = id;
      },
      {
        ...snapshot,
        previousHeight: expandedSize.height,
      },
    );
    layout.commitPending(vi.fn());

    layout.finish(openingId);
    expect(layout.snapshot().animating).toBe(true);
    expect(layout.snapshot().retainedKeys).toContain("week-220");
    layout.finish(closingId);
    expect(layout.snapshot().retainedKeys).toEqual([]);
  });

  it("independently retains simultaneous toggles and cancels removed sections", () => {
    const layout = createCollapsibleListLayout();
    let firstId = 0;
    const removedCommit = vi.fn();
    layout.prepare(
      "week-200",
      expandedSize,
      (id) => {
        firstId = id;
      },
      snapshot,
    );
    layout.prepare("week-400", expandedSize, removedCommit, {
      ...snapshot,
      startBuffered: 395,
      endBuffered: 410,
    });
    layout.cancelItem("week-400");
    layout.commitPending(vi.fn());

    expect(removedCommit).not.toHaveBeenCalled();
    expect(layout.snapshot().retainedKeys).toContain("week-200");
    expect(layout.snapshot().retainedKeys).not.toContain("week-400");
    layout.finish(firstId);
    expect(layout.snapshot().retainedKeys).toEqual([]);
  });

  it("retains a short session's footer until all completion collapses finish", () => {
    const layout = createCollapsibleListLayout();
    const sessionKeys = ["exercise-a", "exercise-b", "session-footer"];
    const sessionSnapshot = {
      itemKeys: sessionKeys,
      startBuffered: 0,
      endBuffered: 1,
      scrollLength: 800,
      previousHeight: expandedSize.height,
    };
    const transitionIds: number[] = [];
    const collapsedExercises: string[] = [];
    const updateSize = vi.fn();

    for (const key of sessionKeys.slice(0, 2)) {
      layout.prepare(
        key,
        collapsedSize,
        (id) => {
          transitionIds.push(id);
          collapsedExercises.push(key);
        },
        sessionSnapshot,
      );
    }

    expect(collapsedExercises).toEqual([]);
    expect(layout.snapshot().retainedKeys).toEqual(sessionKeys);
    layout.commitPending(updateSize);
    expect(collapsedExercises).toEqual(["exercise-a", "exercise-b"]);
    expect(updateSize.mock.calls).toEqual([
      ["exercise-a", collapsedSize],
      ["exercise-b", collapsedSize],
    ]);

    expect(transitionIds).toHaveLength(2);
    for (const [index, transitionId] of transitionIds.entries()) {
      layout.finish(transitionId);
      if (index === 0) {
        expect(layout.snapshot().retainedKeys).toContain("session-footer");
      }
    }
    expect(layout.snapshot().retainedKeys).toEqual([]);
  });
});
