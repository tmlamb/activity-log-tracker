export interface ListItemSize {
  height: number;
  width: number;
}

export interface ListLayoutSnapshot {
  itemKeys: readonly string[];
  startBuffered: number;
  endBuffered: number;
  scrollLength: number;
  previousHeight: number;
  scrollAdjustment?: number;
}

interface LayoutChange {
  itemKey: string;
  size: ListItemSize;
  commit: (transitionId: number) => void;
  retainedKeys: string[];
  pending: boolean;
  previousHeight: number;
}

// Only a conservative render-window estimate. Actual heights still come from
// native text/layout measurement, including font scaling and wrapped headings.
const minimumSectionHeight = 20;

export function createCollapsibleListLayout() {
  const changes = new Map<number, LayoutChange>();
  let nextTransitionId = 0;

  return {
    // Returns whether the pending queue changed and needs a preparation pass.
    prepare(
      itemKey: string,
      size: ListItemSize,
      commit: LayoutChange["commit"],
      snapshot?: ListLayoutSnapshot,
    ) {
      // A rapid second tap supersedes a queued toggle, but an interrupted native
      // animation keeps its lease until its completion/cancellation callback.
      let cancelledPending = false;
      for (const [id, change] of changes) {
        if (change.itemKey === itemKey && change.pending) {
          changes.delete(id);
          cancelledPending = true;
        }
      }

      if (!snapshot || Math.abs(snapshot.previousHeight - size.height) < 0.5) {
        commit(0);
        return cancelledPending;
      }

      const { itemKeys, startBuffered, endBuffered, scrollLength } = snapshot;
      const revealedHeight = Math.min(
        scrollLength,
        Math.max(0, snapshot.previousHeight - size.height),
      );
      const followingCount =
        revealedHeight > 0
          ? Math.ceil(revealedHeight / minimumSectionHeight) + 2
          : 0;
      const precedingCount = snapshot.scrollAdjustment
        ? Math.ceil(
            Math.min(scrollLength, snapshot.scrollAdjustment) /
              minimumSectionHeight,
          ) + 2
        : 0;

      changes.set(++nextTransitionId, {
        itemKey,
        size,
        commit,
        pending: true,
        previousHeight: snapshot.previousHeight,
        retainedKeys: [
          itemKey,
          ...itemKeys.slice(
            Math.max(0, startBuffered - precedingCount),
            endBuffered + 1,
          ),
          ...itemKeys.slice(endBuffered + 1, endBuffered + followingCount + 1),
        ],
      });
      return true;
    },

    commitPending(setItemSize: (itemKey: string, size: ListItemSize) => void) {
      for (const [id, change] of [...changes]) {
        if (!change.pending || !changes.has(id)) continue;
        change.pending = false;
        setItemSize(change.itemKey, change.size);
        change.commit(id);
      }
    },

    finish(transitionId: number) {
      return changes.delete(transitionId);
    },

    cancelItem(itemKey: string) {
      let changed = false;
      for (const [id, change] of changes) {
        if (change.itemKey === itemKey) {
          changes.delete(id);
          changed = true;
        }
      }
      return changed;
    },

    snapshot() {
      const values = [...changes.values()];
      return {
        retainedKeys: [
          ...new Set(values.flatMap((change) => change.retainedKeys)),
        ],
        pending: values.some((change) => change.pending),
        animating: values.some((change) => !change.pending),
        pendingHeightDelta: values.reduce(
          (total, change) =>
            total +
            (change.pending ? change.size.height - change.previousHeight : 0),
          0,
        ),
        pendingShrink: values.reduce(
          (total, change) =>
            total +
            (change.pending
              ? Math.max(0, change.previousHeight - change.size.height)
              : 0),
          0,
        ),
      };
    },

    clear() {
      changes.clear();
    },
  };
}
