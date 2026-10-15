import type {
  LegendListMetrics,
  LegendListRef,
} from "@legendapp/list/react-native";
import type { RefObject } from "react";
import type { LayoutAnimationFunction } from "react-native-reanimated";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import {
  ReduceMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { collapsibleSectionLayoutTransition } from "~/components/collapsible-section-animation";
import {
  createCollapsibleListEndSpace,
  initialCollapsibleEndSpace,
} from "~/utils/collapsible-list-end-space";
import { createCollapsibleListLayout } from "~/utils/collapsible-list-layout";

const animateItemLayout = collapsibleSectionLayoutTransition.build();

// Reanimated 4.5 can discard a layout animation's last native update when it
// finishes before the frame is flushed. Start at the target and hold it until
// the next frame instead of returning raw numbers (implicit zero-duration
// animations). There is no visible motion, including with Reduce Motion enabled.
const immediateLayoutConfig = { duration: 1, reduceMotion: ReduceMotion.Never };

export function useCollapsibleListLayout(
  ref: RefObject<LegendListRef | null>,
  itemKeys: readonly string[],
) {
  const [changes] = useState(createCollapsibleListLayout);
  const [retainedKeys, setRetainedKeys] = useState<string[]>([]);
  const [endReserve, setEndReserve] = useState(initialCollapsibleEndSpace);
  const [endSpace] = useState(() =>
    createCollapsibleListEndSpace(setEndReserve),
  );
  const animating = useSharedValue(false);

  const prepareEndSpace = useCallback(() => {
    const pending = changes.snapshot();
    const state = ref.current?.getState();
    const footerHeight = endSpace.getMeasuredHeight();
    const wouldClamp =
      !!state &&
      state.scroll > 0.5 &&
      state.scroll >
        Math.max(
          0,
          state.contentLength -
            footerHeight -
            pending.pendingShrink -
            state.scrollLength,
        ) +
          0.5;
    endSpace.prepare(pending.pending, pending.pendingShrink, wouldClamp);
  }, [changes, endSpace, ref]);

  const onMetricsChange = useCallback(
    ({ footerSize }: LegendListMetrics) => {
      endSpace.onLayout(footerSize);
    },
    [endSpace],
  );

  const publishRetainedKeys = useCallback(() => {
    const snapshot = changes.snapshot();
    setRetainedKeys(snapshot.retainedKeys);
    animating.set(snapshot.animating);
  }, [animating, changes]);

  const finishLayoutChange = useCallback(
    (transitionId: number) => {
      if (changes.finish(transitionId)) {
        publishRetainedKeys();
      }
    },
    [changes, publishRetainedKeys],
  );

  const cancelItemLayout = useCallback(
    (itemKey: string) => {
      if (changes.cancelItem(itemKey)) {
        prepareEndSpace();
        publishRetainedKeys();
      }
    },
    [changes, prepareEndSpace, publishRetainedKeys],
  );

  const prepareLayoutChange = useCallback(
    (
      itemKey: string,
      change: { heightDelta: number; width: number },
      commit: (transitionId: number) => void,
    ) => {
      const state = ref.current?.getState();
      const index = state?.indexByKey(itemKey);
      const previousHeight =
        state && index != null ? state.sizeAtIndex(index) : 0;
      changes.prepare(
        itemKey,
        {
          // Preserve the row's own padding, margins and header measurement.
          // Only the body changes size when a section opens or closes.
          height: Math.max(0, previousHeight + change.heightDelta),
          width: change.width,
        },
        commit,
        state && index != null
          ? {
              itemKeys,
              startBuffered: state.startBuffered,
              endBuffered: state.endBuffered,
              scrollLength: state.scrollLength,
              previousHeight,
              scrollAdjustment: Math.max(
                0,
                state.scroll -
                  Math.max(
                    0,
                    state.contentLength -
                      endSpace.getMeasuredHeight() +
                      change.heightDelta -
                      state.scrollLength,
                  ),
              ),
            }
          : undefined,
      );
      prepareEndSpace();
      publishRetainedKeys();
    },
    [changes, endSpace, itemKeys, prepareEndSpace, publishRetainedKeys, ref],
  );

  useLayoutEffect(() => {
    if (!changes.snapshot().pending || !endReserve.ready) return;

    // Let the retained window reach native before changing any endpoint. Both
    // the list positions and the section height then change in the same batch.
    let commitFrame: number | undefined;
    const mountFrame = requestAnimationFrame(() => {
      commitFrame = requestAnimationFrame(() => {
        // Recheck the offset after prewarming. Native footer measurement must
        // acknowledge any extra space before we shrink a section's endpoint.
        prepareEndSpace();
        if (!endSpace.canCommit()) return;
        animating.set(true);
        changes.commitPending((itemKey, size) =>
          ref.current?.setItemSize(itemKey, size),
        );
        endSpace.release();
      });
    });

    return () => {
      cancelAnimationFrame(mountFrame);
      if (commitFrame != null) cancelAnimationFrame(commitFrame);
    };
  }, [
    animating,
    changes,
    endReserve.ready,
    endSpace,
    prepareEndSpace,
    ref,
    retainedKeys,
  ]);

  useEffect(() => {
    return () => {
      changes.clear();
      endSpace.clear();
    };
  }, [changes, endSpace]);

  const itemLayoutAnimation = useCallback<LayoutAnimationFunction>(
    (values) => {
      "worklet";
      if (animating.get()) return animateItemLayout(values);

      // Ordinary scrolling, initial measurements and remounts should settle
      // immediately. Keep the integration installed so its containers stay stable.
      const target = {
        originX: values.targetOriginX,
        originY: values.targetOriginY,
        width: values.targetWidth,
        height: values.targetHeight,
      };
      return {
        initialValues: target,
        animations: {
          originX: withTiming(target.originX, immediateLayoutConfig),
          originY: withTiming(target.originY, immediateLayoutConfig),
          width: withTiming(target.width, immediateLayoutConfig),
          height: withTiming(target.height, immediateLayoutConfig),
        },
      };
    },
    [animating],
  );

  return {
    alwaysRender: {
      keys: retainedKeys,
    },
    endReserve,
    finishEndReserve: endSpace.finish,
    onMetricsChange,
    itemLayoutAnimation,
    prepareLayoutChange,
    finishLayoutChange,
    cancelItemLayout,
  };
}

export type CollapsibleListLayout = ReturnType<typeof useCollapsibleListLayout>;
