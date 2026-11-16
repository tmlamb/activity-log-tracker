import { useNativeVariable } from "react-native-css";

/*
 * Header buttons are native `Stack.Toolbar.Button`s rather than React Native
 * views. iOS wraps custom header views in a glass button that is larger than
 * the view, so taps near its edges show the press animation without reaching
 * `onPress`. Native buttons, like the back button, respond across the whole
 * capsule. `Stack.Toolbar` only accepts its own primitives as children, so
 * screens render `Stack.Toolbar.Button` directly and spread these props.
 */

type HeaderButtonColor = "primary" | "foreground";
type HeaderButtonWeight = "regular" | "bold";

/** Tint and label style matching the app's `text-xl` header text actions. */
export function useHeaderButtonProps() {
  const primary = useNativeVariable("--primary") as string;
  const foreground = useNativeVariable("--foreground") as string;
  return (
    color: HeaderButtonColor = "primary",
    weight: HeaderButtonWeight = "regular",
  ) => {
    const tint = color === "primary" ? primary : foreground;
    return {
      tintColor: tint,
      style: {
        color: tint,
        // `text-xl` is 1.25rem, and react-native-css uses a 14pt rem.
        fontSize: 17.5,
        fontWeight: weight === "bold" ? ("700" as const) : ("400" as const),
      },
    };
  };
}

/**
 * Header icons are SF Symbols. react-native-screens rebuilds native bar items
 * each time a screen appears; image icons then load asynchronously in release
 * builds, leaving an empty, resizing button during navigation transitions.
 * SF Symbols load synchronously. Tint them with `tintColor`.
 */
export const headerIcons = {
  insights: "chart.bar.xaxis.ascending",
  plus: "plus",
} as const;
