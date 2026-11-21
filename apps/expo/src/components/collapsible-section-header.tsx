import { Fragment, useEffect } from "react";
import { Platform } from "react-native";
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

/**
 * Keep one title part on one line: its spaces and hyphens no longer allow a
 * line break, so a wrapped title only breaks between parts.
 */
/** A fixed-width font, so the separator looks the same between any names. */
const separatorFont = Platform.select({ ios: "Menlo", default: "monospace" });

export function unbreakable(text: string) {
  return text.replace(/ /g, "\u00A0").replace(/-/g, "\u2011");
}

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
      <SectionHeading
        placement="inline"
        // Every collapsible header wraps with the same, slightly tight lines.
        className={twMerge("flex-1 pr-3 leading-[1.15]", titleClassName)}
      >
        {titleParts && titleParts.length > 1
          ? titleParts.map((part, index) => (
              <Fragment key={`${index}:${part}`}>
                {/* The only breakable space is before the arrow, which
                    then starts the next line, joined to the part after it. A
                    word joiner (U+2060) keeps the arrow with its no-break space,
                    since some separators (like "|") allow a break after them. */}
                {index > 0 && (
                  <>
                    {" "}
                    {/* Lighter than the semibold heading so names stand out,
                        and a touch larger since the glyph reads small. */}
                    <Text
                      className="text-muted text-[22px] font-normal"
                      style={{ fontFamily: separatorFont }}
                    >
                      {"\u21C4"}
                    </Text>
                    {"\u2060\u00A0"}
                  </>
                )}
                {unbreakable(part)}
              </Fragment>
            ))
          : title}
      </SectionHeading>
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
