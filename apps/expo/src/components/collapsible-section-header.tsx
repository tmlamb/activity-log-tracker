import { useEffect } from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AntDesign } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";

import PressableThemed from "./PressableThemed";
import { SectionHeading } from "./Typography";

interface CollapsibleSectionHeaderProps {
  title: string;
  collapsed: boolean;
  onPress: () => void;
  className?: string;
  titleClassName?: string;
  chevronClassName?: string;
  accessibilityLabel?: string;
}

export function CollapsibleSectionHeader({
  title,
  collapsed,
  onPress,
  className,
  titleClassName,
  chevronClassName,
  accessibilityLabel,
}: CollapsibleSectionHeaderProps) {
  const chevronRotation = useSharedValue(collapsed ? 0 : 90);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  useEffect(() => {
    chevronRotation.value = withTiming(collapsed ? 0 : 90, { duration: 180 });
  }, [chevronRotation, collapsed]);

  return (
    <PressableThemed
      className={twMerge(
        "mx-5 flex-row items-center justify-between pt-3 pb-2",
        className,
      )}
      onPress={onPress}
      accessibilityLabel={
        accessibilityLabel ?? `${collapsed ? "Expand" : "Collapse"} ${title}`
      }
      accessibilityState={{ expanded: !collapsed }}
    >
      <SectionHeading
        placement="inline"
        className={twMerge("flex-1 pr-3", titleClassName)}
      >
        {title}
      </SectionHeading>
      <Animated.Text
        maxFontSizeMultiplier={2.5}
        className={twMerge("text-muted", chevronClassName)}
        style={chevronStyle}
      >
        <AntDesign name="right" size={15} />
      </Animated.Text>
    </PressableThemed>
  );
}
