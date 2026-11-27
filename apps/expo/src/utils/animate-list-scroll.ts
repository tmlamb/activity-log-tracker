import type { LegendListRef } from "@legendapp/list/react-native";

/** The parts of a Legend list this needs; a section list's ref has them too. */
export interface ScrollableList {
  getState: () => Pick<
    ReturnType<LegendListRef["getState"]>,
    | "data"
    | "scroll"
    | "scrollLength"
    | "contentLength"
    | "positionAtIndex"
    | "sizeAtIndex"
    | "getAverageItemSizes"
  >;
  getNativeScrollRef: () => {
    scrollTo: (options: { y: number; animated: boolean }) => void;
  };
}

/** What covers the list's top and bottom, as the native list insets it. */
export interface ListInsets {
  top: number;
  bottom: number;
}

export const CENTER_SCROLL_DURATION_MS = 400;

/** How many frames an opening jump may take to find the list and settle. */
const JUMP_MAX_FRAMES = 30;
/** How many frames the target must hold still before a jump is done. */
const JUMP_SETTLED_FRAMES = 5;

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;

type ListState = ReturnType<ScrollableList["getState"]>;

/**
 * The native offset that puts the row at `index` in the middle of the area
 * `insets` leave uncovered, or as close as the top or bottom of the list
 * allows.
 */
function centerOffset(state: ListState, index: number, insets: ListInsets) {
  // Unmeasured rows report no size until they are first rendered.
  const averages = Object.values(state.getAverageItemSizes());
  const size =
    (state.sizeAtIndex(index) as number | undefined) ??
    averages[0]?.average ??
    0;
  const visibleLength = state.scrollLength - insets.top - insets.bottom;
  const top = -insets.top;
  const bottom = Math.max(
    top,
    state.contentLength - state.scrollLength + insets.bottom,
  );
  return Math.min(
    bottom,
    Math.max(
      top,
      state.positionAtIndex(index) + size / 2 - insets.top - visibleLength / 2,
    ),
  );
}

/**
 * Smoothly scrolls `list` so the row whose flat list item `matches` sits in
 * the middle of the area `insets` leave uncovered, such as between a header
 * and a toolbar, or as close as the top or bottom of the list allows.
 *
 * Legend's own animated scroll is cut off natively as soon as it renders the
 * rows near its target, leaving the list near the top. This instead sets the
 * native offset unanimated each frame, which nothing can cancel, and the list
 * follows the scroll events as it does a drag. The target is re-read every
 * frame, as rows rendered on the way are measured.
 *
 * The native list scrolls from `-insets.top` to `insets.bottom` past the end
 * of its content; it needs `scrollToOverflowEnabled` so React Native doesn't
 * clamp that range to the content. Returns a function that stops the scroll.
 */
export function animateListScrollToCenter(
  getList: () => ScrollableList | null,
  matches: (item: unknown) => boolean,
  getInsets: () => ListInsets,
  durationMs = CENTER_SCROLL_DURATION_MS,
): () => void {
  let frame: number | undefined;
  let start: { time: number; offset: number } | undefined;
  const step = (time: number) => {
    frame = undefined;
    const list = getList();
    if (!list) return;
    const state = list.getState();
    const index = state.data.findIndex(matches);
    if (index === -1) return;
    start ??= { time, offset: state.scroll };
    const target = centerOffset(state, index, getInsets());
    const progress = Math.min(1, (time - start.time) / durationMs);
    list.getNativeScrollRef().scrollTo({
      y: start.offset + (target - start.offset) * easeInOutCubic(progress),
      animated: false,
    });
    if (progress < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
  return () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
  };
}

/**
 * Places `list` where `animateListScrollToCenter` would leave it, without the
 * animation, for a list that opens on a row. It waits for the list to be laid
 * out and for `getInsets` to report, then repeats the jump while the rows it
 * lands on are measured and move the target, until the target holds still.
 *
 * Each repeat trails the list's own layout by a frame or more, which shows as
 * the rows shifting and shifting back, so the caller hides the list until
 * `onDone`. That is called however the jump ends, short of being stopped by
 * the function this returns.
 */
export function jumpListScrollToCenter(
  getList: () => ScrollableList | null,
  matches: (item: unknown) => boolean,
  getInsets: () => ListInsets | null,
  onDone: () => void,
): () => void {
  let frame: number | undefined;
  let frames = 0;
  let settled = 0;
  let lastTarget: number | undefined;
  const step = () => {
    frame = undefined;
    if (!jump() || ++frames >= JUMP_MAX_FRAMES) onDone();
    else frame = requestAnimationFrame(step);
  };
  /** Returns whether the jump has more to do. */
  const jump = () => {
    const state = getList()?.getState();
    const insets = getInsets();
    if (state && insets && state.scrollLength > 0) {
      const index = state.data.findIndex(matches);
      if (index === -1) return false;
      const target = centerOffset(state, index, insets);
      if (target === lastTarget) {
        if (++settled >= JUMP_SETTLED_FRAMES) return false;
      } else {
        settled = 0;
        lastTarget = target;
        getList()
          ?.getNativeScrollRef()
          .scrollTo({ y: target, animated: false });
      }
    }
    return true;
  };
  frame = requestAnimationFrame(step);
  return () => {
    if (frame !== undefined) cancelAnimationFrame(frame);
  };
}
