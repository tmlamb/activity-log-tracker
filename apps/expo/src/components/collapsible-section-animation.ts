import { Easing, LinearTransition } from "react-native-reanimated";

export const collapseAnimationDuration = 320;
export const collapseAnimationEasing = Easing.bezier(0.22, 0, 0, 1);

export const collapsibleSectionLayoutTransition = LinearTransition.duration(
  collapseAnimationDuration,
).easing(collapseAnimationEasing);
