import type { ComponentProps, ReactNode } from "react";
import { createContext, use } from "react";
import { Text as NativeText, useWindowDimensions } from "react-native";
import Animated from "react-native-reanimated";

const FontScaleContext = createContext(1);

export function FontScaleProvider({ children }: { children: ReactNode }) {
  const { fontScale } = useWindowDimensions();
  return <FontScaleContext value={fontScale}>{children}</FontScaleContext>;
}

// Recreate only native text nodes on a system font-scale change. This forces
// fresh native measurements without resetting screen, list, or form state.
export function Text(props: ComponentProps<typeof NativeText>) {
  const fontScale = use(FontScaleContext);
  return <NativeText key={fontScale} {...props} />;
}

export function AnimatedText(props: ComponentProps<typeof Animated.Text>) {
  const fontScale = use(FontScaleContext);
  return <Animated.Text key={fontScale} {...props} />;
}
