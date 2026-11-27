import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ScrollableList } from "./animate-list-scroll";
import {
  animateListScrollToCenter,
  jumpListScrollToCenter,
} from "./animate-list-scroll";

let frames: ((time: number) => void)[] = [];
let now = 0;
/** Runs the pending frame at `time` ms after the scroll began. */
const frameAt = (time: number) => {
  now = time;
  const pending = frames;
  frames = [];
  for (const callback of pending) callback(now);
};

beforeEach(() => {
  frames = [];
  now = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: (time: number) => void) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    frames = [];
  });
});
afterEach(() => {
  vi.unstubAllGlobals();
});

/** Rows of 50 at 50 × index, in a 500 tall list, scrolled to `scroll`. */
function list(rows: number, scroll: number) {
  const state = {
    data: Array.from({ length: rows }, (_, index) => ({ key: `row${index}` })),
    scroll,
    scrollLength: 500,
    contentLength: rows * 50,
    positionAtIndex: (index: number) => index * 50,
    sizeAtIndex: (index: number) => (index < 10 ? 50 : undefined),
    getAverageItemSizes: () => ({ item: { average: 50, count: 10 } }),
  };
  const scrollTo = vi.fn(({ y }: { y: number; animated: boolean }) => {
    state.scroll = y;
  });
  const ref = {
    getState: () => state,
    getNativeScrollRef: () => ({ scrollTo }),
  } as unknown as ScrollableList;
  return { ref, state, scrollTo };
}
/** A 70 tall header and a 90 tall toolbar leave 340 of the 500 visible. */
const insets = () => ({ top: 70, bottom: 90 });
const row = (key: string) => (item: unknown) =>
  (item as { key: string }).key === key;

describe("animateListScrollToCenter", () => {
  it("eases unanimated offsets to center the row in the visible area", () => {
    const { ref, scrollTo } = list(100, -70);
    animateListScrollToCenter(() => ref, row("row40"), insets, 400);
    frameAt(0);
    frameAt(200);
    frameAt(400);
    // Row 40's middle at 2025, 170 below the 70 covered by the header.
    expect(scrollTo.mock.calls.map(([options]) => options)).toEqual([
      { y: -70, animated: false },
      { y: -70 + (1785 + 70) / 2, animated: false },
      { y: 1785, animated: false },
    ]);
    expect(frames).toHaveLength(0);
  });

  it("stops at the inset bottom or top of the list", () => {
    const end = list(100, 0);
    animateListScrollToCenter(() => end.ref, row("row99"), insets, 400);
    frameAt(0);
    frameAt(400);
    // The last row ends 90 past the content, clear of the toolbar.
    expect(end.scrollTo).toHaveBeenLastCalledWith({ y: 4590, animated: false });

    const top = list(100, -70);
    animateListScrollToCenter(() => top.ref, row("row2"), insets, 400);
    frameAt(0);
    frameAt(400);
    expect(top.scrollTo).toHaveBeenLastCalledWith({ y: -70, animated: false });
  });

  it("follows the row as rows on the way are measured", () => {
    const { ref, state, scrollTo } = list(100, 0);
    animateListScrollToCenter(() => ref, row("row40"), insets, 400);
    frameAt(0);
    state.positionAtIndex = (index) => index * 60;
    frameAt(400);
    expect(scrollTo).toHaveBeenLastCalledWith({ y: 2185, animated: false });
  });

  it("stops when cancelled or when the row is gone", () => {
    const { ref, state, scrollTo } = list(100, 0);
    const cancel = animateListScrollToCenter(
      () => ref,
      row("row40"),
      insets,
      400,
    );
    frameAt(0);
    cancel();
    frameAt(200);
    expect(scrollTo).toHaveBeenCalledOnce();

    animateListScrollToCenter(() => ref, row("row40"), insets, 400);
    state.data = [];
    frameAt(0);
    expect(scrollTo).toHaveBeenCalledOnce();
    expect(frames).toHaveLength(0);
  });
});

describe("jumpListScrollToCenter", () => {
  it("jumps once the list is laid out and the insets are known", () => {
    const { ref, state, scrollTo } = list(100, -70);
    let known: ReturnType<typeof insets> | null = null;
    state.scrollLength = 0;
    jumpListScrollToCenter(
      () => ref,
      row("row40"),
      () => known,
      vi.fn(),
    );
    frameAt(0);
    state.scrollLength = 500;
    frameAt(16);
    expect(scrollTo).not.toHaveBeenCalled();
    known = insets();
    frameAt(32);
    expect(scrollTo.mock.calls).toEqual([[{ y: 1785, animated: false }]]);
  });

  it("jumps again as the rows it lands on are measured, then is done", () => {
    const { ref, state, scrollTo } = list(100, -70);
    const done = vi.fn();
    jumpListScrollToCenter(() => ref, row("row40"), insets, done);
    frameAt(0);
    state.positionAtIndex = (index) => index * 60;
    frameAt(16);
    expect(scrollTo.mock.calls.map(([{ y }]) => y)).toEqual([1785, 2185]);
    // Done only once the target has held still for five more frames.
    for (let time = 32; time <= 80; time += 16) frameAt(time);
    expect(done).not.toHaveBeenCalled();
    frameAt(96);
    expect(done).toHaveBeenCalledOnce();
    expect(frames).toHaveLength(0);
    expect(scrollTo).toHaveBeenCalledTimes(2);
  });

  it("is done with a list that never appears or a missing row", () => {
    const never = vi.fn();
    jumpListScrollToCenter(() => null, row("row40"), insets, never);
    let waited = 0;
    for (; frames.length; waited++) frameAt(waited * 16);
    expect(waited).toBe(30);
    expect(never).toHaveBeenCalledOnce();

    const { ref, scrollTo } = list(100, -70);
    const missing = vi.fn();
    jumpListScrollToCenter(() => ref, row("missing"), insets, missing);
    frameAt(0);
    expect(frames).toHaveLength(0);
    expect(missing).toHaveBeenCalledOnce();
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("stops without being done when cancelled", () => {
    const { ref, scrollTo } = list(100, -70);
    const done = vi.fn();
    jumpListScrollToCenter(() => ref, row("row40"), insets, done)();
    frameAt(0);
    expect(scrollTo).not.toHaveBeenCalled();
    expect(done).not.toHaveBeenCalled();
  });
});
