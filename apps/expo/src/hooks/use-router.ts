import { useEffect, useMemo, useRef } from "react";
// The one place allowed to use expo-router's hook; see eslint.config.mts.
// eslint-disable-next-line no-restricted-imports
import { useRouter as useExpoRouter } from "expo-router";
import { useNavigation } from "expo-router/react-navigation";

/** How long a navigation that never left this screen keeps it locked. */
const UNLOCK_WITHOUT_LEAVING_MS = 1000;

/**
 * expo-router's router, guarded against double presses: once this screen
 * navigates, further navigation from it is ignored until it is focused again,
 * so a second tap can't push a screen twice or go back two screens. Calls made
 * in the same press (such as two `back()`s in one handler) all run.
 *
 * `isNavigating()` lets a handler that saves before navigating ignore the
 * second press too.
 */
export default function useRouter() {
  const router = useExpoRouter();
  const navigation = useNavigation();
  const locked = useRef(false);
  const inPress = useRef(false);
  const left = useRef(false);

  // Listen rather than read focus state, so focus changes don't re-render.
  useEffect(() => {
    const unsubscribeBlur = navigation.addListener("blur", () => {
      if (locked.current) left.current = true;
    });
    const unsubscribeFocus = navigation.addListener("focus", () => {
      if (!left.current) return;
      left.current = false;
      locked.current = false;
    });
    return () => {
      unsubscribeBlur();
      unsubscribeFocus();
    };
  }, [navigation]);

  return useMemo(() => {
    const guard =
      <Args extends unknown[]>(navigate: (...args: Args) => void) =>
      (...args: Args) => {
        if (locked.current && !inPress.current) return;
        if (!locked.current) {
          locked.current = true;
          inPress.current = true;
          queueMicrotask(() => {
            inPress.current = false;
          });
          // A navigation that didn't happen (e.g. one blocked by an unsaved
          // changes prompt) mustn't lock this screen for good.
          setTimeout(() => {
            if (!left.current) locked.current = false;
          }, UNLOCK_WITHOUT_LEAVING_MS);
        }
        navigate(...args);
      };
    return {
      ...router,
      push: guard(router.push),
      navigate: guard(router.navigate),
      replace: guard(router.replace),
      back: guard(router.back),
      dismiss: guard(router.dismiss),
      dismissTo: guard(router.dismissTo),
      dismissAll: guard(router.dismissAll),
      isNavigating: () => locked.current,
    };
  }, [router]);
}
