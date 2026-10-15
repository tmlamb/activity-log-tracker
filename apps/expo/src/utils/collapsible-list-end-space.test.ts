import { describe, expect, it, vi } from "vitest";

import {
  createCollapsibleListEndSpace,
  initialCollapsibleEndSpace,
} from "./collapsible-list-end-space";
import { createCollapsibleListLayout } from "./collapsible-list-layout";

function setup() {
  let state = initialCollapsibleEndSpace;
  const render = vi.fn((next: typeof state) => {
    state = next;
  });
  const space = createCollapsibleListEndSpace(render);
  return { space, render, state: () => state };
}

describe("collapsible list native end space", () => {
  it("waits for the native footer before committing a smaller section, regardless of frame delays", () => {
    const { space, state } = setup();
    const layout = createCollapsibleListLayout();
    const updateSize = vi.fn();
    const commit = vi.fn();
    layout.prepare("last", { width: 350, height: 40 }, commit, {
      itemKeys: ["before", "last"],
      previousHeight: 340,
      scrollLength: 800,
      startBuffered: 0,
      endBuffered: 1,
    });
    space.prepare(true, layout.snapshot().pendingShrink, true);

    // An old zero-height measurement and elapsed frames are not a readiness ack.
    space.onLayout(0);
    for (let frame = 0; frame < 20; frame++) {
      if (space.canCommit()) layout.commitPending(updateSize);
    }
    expect(commit).not.toHaveBeenCalled();
    expect(updateSize).not.toHaveBeenCalled();
    expect(state()).toMatchObject({ height: 300, ready: false });

    space.onLayout(300);
    expect(space.canCommit()).toBe(true);
    layout.commitPending(updateSize);
    space.release();
    for (const height of [280, 230, 140, 50, 0]) space.onLayout(height);
    space.finish(state().id);

    expect(updateSize.mock.calls).toEqual([
      ["last", { width: 350, height: 40 }],
    ]);
    expect(commit).toHaveBeenCalledOnce();
    expect(state()).toMatchObject({ phase: "idle", height: 0 });
  });

  it("does not rerender or resize rows for animation-frame measurements", () => {
    const { space, state, render } = setup();
    space.prepare(true, 300, true);
    space.onLayout(300);
    space.release();
    render.mockClear();

    for (let frame = 0; frame <= 40; frame++)
      space.onLayout(300 * (1 - frame / 40));
    expect(render).not.toHaveBeenCalled();
    space.finish(state().id);
    expect(render).toHaveBeenCalledOnce();
  });

  it("adds no preparation work when the viewport already fits the collapsed content", () => {
    const { space, render } = setup();
    space.prepare(true, 300, false);
    expect(space.canCommit()).toBe(true);
    space.release();
    expect(render).not.toHaveBeenCalled();
  });

  it("replaces queued shrink totals instead of counting repeated preparations twice", () => {
    const { space, state } = setup();
    space.prepare(true, 300, true);
    space.onLayout(300);
    space.prepare(true, 300, true);
    expect(space.canCommit()).toBe(true);
    expect(state().height).toBe(300);

    space.prepare(true, 500, true);
    expect(space.canCommit()).toBe(false);
    space.onLayout(500);
    space.prepare(true, 200, true);
    expect(state().height).toBe(200);
    expect(space.canCommit()).toBe(false);
    space.onLayout(200);
    expect(space.canCommit()).toBe(true);
  });

  it("releases the space if a rapid second tap cancels the queued collapse", () => {
    const { space, state } = setup();
    space.prepare(true, 300, true);
    space.onLayout(300);
    space.prepare(false, 0, false);
    expect(state().phase).toBe("releasing");
    space.finish(state().id);
    expect(state().height).toBe(0);
  });

  it("uses the remaining native height when another collapse interrupts the release", () => {
    const { space, state } = setup();
    space.prepare(true, 300, true);
    space.onLayout(300);
    space.release();
    const previousId = state().id;
    space.onLayout(120);

    space.prepare(true, 200, true);
    expect(state().height).toBe(320);
    expect(space.canCommit()).toBe(false);
    space.finish(previousId);
    expect(state()).toMatchObject({ phase: "holding", height: 320 });
    space.onLayout(320);
    expect(space.canCommit()).toBe(true);
  });

  it("holds the remaining space until a reversal's growing endpoint commits", () => {
    const { space, state } = setup();
    space.prepare(true, 300, true);
    space.onLayout(300);
    space.release();
    space.onLayout(120);

    space.prepare(true, 0, false);
    expect(state()).toMatchObject({
      phase: "holding",
      height: 120,
      ready: true,
    });
    space.release();
    expect(state().phase).toBe("releasing");
  });

  it("ignores a completion queued before unmount", () => {
    const { space, state, render } = setup();
    space.prepare(true, 300, true);
    space.onLayout(300);
    space.release();
    const id = state().id;
    space.clear();
    render.mockClear();
    space.finish(id);
    expect(render).not.toHaveBeenCalled();
  });
});
