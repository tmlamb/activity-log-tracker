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

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;

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
    // Unmeasured rows report no size until they are first rendered.
    const averages = Object.values(state.getAverageItemSizes());
    const size =
      (state.sizeAtIndex(index) as number | undefined) ??
      averages[0]?.average ??
      0;
    const insets = getInsets();
    const visibleLength = state.scrollLength - insets.top - insets.bottom;
    const top = -insets.top;
    const bottom = Math.max(
      top,
      state.contentLength - state.scrollLength + insets.bottom,
    );
    const target = Math.min(
      bottom,
      Math.max(
        top,
        state.positionAtIndex(index) +
          size / 2 -
          insets.top -
          visibleLength / 2,
      ),
    );
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
