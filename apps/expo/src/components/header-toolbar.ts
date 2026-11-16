import { useNativeVariable } from "react-native-css";

import insightsIcon from "../../assets/icons/insights.png";
import plusIcon from "../../assets/icons/plus.png";

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
 * Header icons are bundled PNGs of the vector icon glyphs they replace
 * (insights: MaterialCommunityIcons at 24pt; plus: AntDesign at 26pt), with
 * @2x and @3x variants. react-native-screens rebuilds native bar items whenever
 * header options update and reloads their images; only bundled images load
 * synchronously, so anything else leaves an empty, resizing button during
 * navigation transitions. Tint them with `tintColor`.
 */
export const headerIcons = { insights: insightsIcon, plus: plusIcon };
