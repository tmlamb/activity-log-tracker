import type { ComponentType } from "react";
import Animated from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { styled } from "nativewind";

export const AnimatedViewStyled = styled(
  Animated.View as ComponentType,
) as typeof Animated.View;
export const AnimatedTextStyled = styled(
  Animated.Text as ComponentType,
) as typeof Animated.Text;
export const BlurViewStyled = styled(
  BlurView as ComponentType,
) as typeof BlurView;
