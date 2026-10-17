export interface CollapsibleEndSpace {
  id: number;
  phase: "idle" | "holding" | "releasing";
  height: number;
  ready: boolean;
}

export const initialCollapsibleEndSpace: CollapsibleEndSpace = {
  id: 0,
  phase: "idle",
  height: 0,
  ready: true,
};

const layoutEpsilon = 0.5;

/** Coordinates native footer space; animated frames never update React state. */
export function createCollapsibleListEndSpace(
  onChange: (space: CollapsibleEndSpace) => void,
) {
  let space = initialCollapsibleEndSpace;
  let measuredHeight = 0;
  let heightBeforePendingChanges = 0;

  const publish = (next: CollapsibleEndSpace) => {
    space = next;
    onChange(next);
  };

  const release = () => {
    if (space.phase !== "holding") return;
    publish({ ...space, id: space.id + 1, phase: "releasing", ready: true });
  };

  return {
    getMeasuredHeight: () => measuredHeight,

    prepare(pending: boolean, shrink: number, needsReserve: boolean) {
      if (!pending) {
        // A second tap can cancel a toggle before its endpoint was committed.
        release();
        return;
      }

      if (space.phase !== "holding") {
        heightBeforePendingChanges = measuredHeight;
      }
      const height = heightBeforePendingChanges + (needsReserve ? shrink : 0);
      if (space.phase === "holding" && space.height === height) return;
      if (space.phase === "idle" && height === 0) return;

      publish({
        id: space.id + 1,
        phase: "holding",
        height,
        ready: Math.abs(measuredHeight - height) <= layoutEpsilon,
      });
    },

    onLayout(height: number) {
      measuredHeight = height;
      if (
        space.phase === "holding" &&
        !space.ready &&
        Math.abs(height - space.height) <= layoutEpsilon
      ) {
        // This is LegendList's measured *native footer*, not a speculative
        // item-cache size. Only now can a smaller section safely commit.
        publish({ ...space, ready: true });
      }
    },

    canCommit: () => space.ready,
    release,

    finish: (id: number) => {
      if (space.id !== id || space.phase !== "releasing") return;
      // Completion can reach JS before the final native layout event. Preserve
      // the last reported height so our geometry stays consistent with LegendList
      // and a rapid next tap does not wait for a deduplicated measurement.
      publish({ id, phase: "idle", height: 0, ready: true });
    },

    clear() {
      // Ignore a queued UI-thread completion after unmount/Strict Mode cleanup.
      space = { ...initialCollapsibleEndSpace, id: space.id + 1 };
      measuredHeight = 0;
      heightBeforePendingChanges = 0;
    },
  };
}
