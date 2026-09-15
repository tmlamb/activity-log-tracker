import type { ComponentType } from "react";
import Animated from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { LegendList } from "@legendapp/list/react-native";
import { SectionList as LegendSectionList } from "@legendapp/list/section-list";
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
export const LegendListStyled = styled(
  LegendList as unknown as ComponentType<Record<string, unknown>>,
  {
    className: "style",
    contentContainerClassName: "contentContainerStyle",
  },
) as unknown as typeof LegendList;
export const LegendSectionListStyled = styled(
  LegendSectionList as unknown as ComponentType<Record<string, unknown>>,
  {
    className: "style",
    contentContainerClassName: "contentContainerStyle",
  },
) as unknown as typeof LegendSectionList;
