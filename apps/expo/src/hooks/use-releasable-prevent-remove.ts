import { useEffect, useRef, useState } from "react";
import { useNavigation, usePreventRemove } from "expo-router/react-navigation";

/** How long a release that never left this screen keeps it unprotected. */
const REARM_WITHOUT_LEAVING_MS = 1000;

/**
 * `usePreventRemove` that can be released to let the screen go, and that
 * protects the screen again if it is still here afterwards: when it regains
 * focus, or when the navigation never happened (for example one ignored as a
 * double press).
 *
 * A blocked action stays blocked if re-dispatched, so `onPrevented` continues
 * it with `repeat` rather than `navigation.dispatch(data.action)`. To navigate
 * somewhere else instead, call the returned `release` first.
 */
export default function useReleasablePreventRemove(
  preventRemove: boolean,
  onPrevented: (event: { repeat: () => void }) => void,
  options?: { onRearm?: () => void },
) {
  const navigation = useNavigation();
  // Prevention is keyed off this state so it stays in sync with
  // `repeat`/`disablePrevention`, which turn it off.
  const [released, setReleased] = useState(false);
  const left = useRef(false);
  const rearmTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const onRearm = useRef(options?.onRearm);
  useEffect(() => {
    onRearm.current = options?.onRearm;
  });

  const rearm = () => {
    clearTimeout(rearmTimer.current);
    rearmTimer.current = undefined;
    left.current = false;
    setReleased(false);
    onRearm.current?.();
  };
  const markReleased = () => {
    left.current = false;
    setReleased(true);
    clearTimeout(rearmTimer.current);
    rearmTimer.current = setTimeout(() => {
      rearmTimer.current = undefined;
      if (!left.current) rearm();
    }, REARM_WITHOUT_LEAVING_MS);
  };
  const rearmRef = useRef(rearm);
  useEffect(() => {
    rearmRef.current = rearm;
  });

  // Listen rather than read focus state, so focus changes don't re-render.
  useEffect(() => {
    const unsubscribeBlur = navigation.addListener("blur", () => {
      if (rearmTimer.current !== undefined) left.current = true;
    });
    const unsubscribeFocus = navigation.addListener("focus", () => {
      if (!left.current) return;
      rearmRef.current();
    });
    return () => {
      unsubscribeBlur();
      unsubscribeFocus();
    };
  }, [navigation]);
  // Only on unmount: re-subscribing above must not cancel a pending re-arm.
  useEffect(() => () => clearTimeout(rearmTimer.current), []);

  const disablePrevention = usePreventRemove(
    preventRemove && !released,
    ({ repeat }) => {
      onPrevented({
        repeat: () => {
          markReleased();
          repeat();
        },
      });
    },
  );

  return {
    /** Stop protecting the screen, before navigating away from it. */
    release: () => {
      markReleased();
      disablePrevention();
    },
  };
}
