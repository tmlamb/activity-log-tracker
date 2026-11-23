import { useEffect } from "react";
import { Platform, View } from "react-native";
import {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AntDesign } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";

import { AnimatedText, Text } from "./font-scale-text";
import PressableThemed from "./PressableThemed";
import { SectionHeading } from "./Typography";

interface CollapsibleSectionHeaderProps {
  title: string;
  /** Title parts separated by a muted " ⇄ ", in place of `title`. */
  titleParts?: string[];
  collapsed: boolean;
  onPress: () => void;
  className?: string;
  titleClassName?: string;
  chevronClassName?: string;
  accessibilityLabel?: string;
}

/** A fixed-width font, so the separator looks the same between any names. */
const separatorFont = Platform.select({ ios: "Menlo", default: "monospace" });

export function CollapsibleSectionHeader({
  title,
  titleParts,
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
      {titleParts && titleParts.length > 1 ? (
        // Each part is its own item in a wrapping row, so a line only ever
        // breaks between parts and every new line starts with an arrow. A part
        // too long for a line gets a line of its own and wraps inside its
        // column, indented past the arrow. Spaces are text, not margins, so
        // they scale with the font.
        <View className="flex-1 flex-row flex-wrap pr-3">
          {titleParts.map((part, index) => (
            <View
              key={`${index}:${part}`}
              className="shrink flex-row items-baseline"
            >
              {index > 0 && (
                <SectionHeading
                  placement="inline"
                  className={twMerge("leading-[1.15]", titleClassName)}
                >
                  {/* Lighter than the semibold heading so names stand out,
                      and a touch larger since the glyph reads small. */}
                  <Text
                    className="text-muted text-[22px] font-normal"
                    style={{ fontFamily: separatorFont }}
                  >
                    {"\u21C4"}
                  </Text>
                  {"\u00A0"}
                </SectionHeading>
              )}
              <SectionHeading
                placement="inline"
                className={twMerge("shrink leading-[1.15]", titleClassName)}
              >
                {/* The space before the next part ends this one, so a line
                    never starts with a space. */}
                {index < titleParts.length - 1 ? `${part}\u00A0` : part}
              </SectionHeading>
            </View>
          ))}
        </View>
      ) : (
        <SectionHeading
          placement="inline"
          // Every collapsible header wraps with the same, slightly tight lines.
          className={twMerge("flex-1 pr-3 leading-[1.15]", titleClassName)}
        >
          {title}
        </SectionHeading>
      )}
      <AnimatedText
        maxFontSizeMultiplier={2.5}
        className={twMerge("text-muted", chevronClassName)}
        style={chevronStyle}
      >
        <AntDesign name="right" size={15} />
      </AnimatedText>
    </PressableThemed>
  );
}
