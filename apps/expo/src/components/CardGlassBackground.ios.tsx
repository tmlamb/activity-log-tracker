import type { LayoutChangeEvent } from "react-native";
import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useNativeVariable } from "react-native-css";
import { Button, Host, RNHostView, Text, VStack } from "@expo/ui/swift-ui";
import {
  accessibilityLabel as accessibilityLabelModifier,
  buttonStyle,
  disabled as disabledModifier,
  font,
  foregroundStyle,
  frame,
  glassEffect,
  offset,
  padding,
} from "@expo/ui/swift-ui/modifiers";
import { twMerge } from "tailwind-merge";

export interface CardGlassEffectStyle {
  style?: "regular" | "clear" | "none";
  animate?: boolean;
  animationDuration?: number;
}

interface CardGlassBackgroundProps {
  glassEffectStyle?: CardGlassEffectStyle;
  children?: React.ReactNode;
  contentClassName?: string;
  nativeContentClassName?: string;
  nativeGlassButton?: {
    label: string;
    onPress: () => void;
    accessibilityLabel: string;
    disabled?: boolean;
    overlay?: React.ReactNode;
  };
}

const liquidGlassMinimumIosVersion = 26;
export function isCardLiquidGlassAvailable() {
  const majorVersion =
    typeof Platform.Version === "string"
      ? Number.parseInt(Platform.Version, 10)
      : Platform.Version;

  return majorVersion >= liquidGlassMinimumIosVersion;
}

export default function CardGlassBackground({
  glassEffectStyle,
  children,
  contentClassName,
  nativeContentClassName,
  nativeGlassButton,
}: CardGlassBackgroundProps) {
  const primaryColor = useNativeVariable("--primary") as string;
  const [size, setSize] = useState({ width: 0, height: 0 });
  const style = glassEffectStyle?.style ?? "regular";

  if (!isCardLiquidGlassAvailable() || style === "none") {
    return (
      <View
        className={twMerge(
          "h-full w-full",
          style === "none" ? "" : "bg-card",
          contentClassName,
        )}
      >
        {children}
      </View>
    );
  }

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;

    if (width !== size.width || height !== size.height) {
      setSize({ width, height });
    }
  };
  const contentHeight = Math.min(size.height, 28);
  const nativeLabelPadding = 12;
  const nativeLabelVerticalPadding = 8;
  const nativeLabelWidth = Math.max(size.width - nativeLabelPadding * 2, 0);
  const glassVariant = style === "clear" ? "clear" : "regular";

  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={onLayout}
    >
      {size.width > 0 && size.height > 0 ? (
        <Host style={size} ignoreSafeArea="all">
          {nativeGlassButton ? (
            <Button
              onPress={
                nativeGlassButton.disabled
                  ? undefined
                  : nativeGlassButton.onPress
              }
              modifiers={[
                frame({
                  width: size.width,
                  height: size.height,
                  alignment: "center",
                }),
                buttonStyle("plain"),
                glassEffect({
                  glass: { variant: glassVariant, interactive: true },
                  shape: "roundedRectangle",
                  cornerRadius: 32,
                }),
                disabledModifier(nativeGlassButton.disabled ?? false),
                accessibilityLabelModifier(
                  nativeGlassButton.accessibilityLabel,
                ),
              ]}
            >
              <ButtonText
                label={nativeGlassButton.label}
                primaryColor={primaryColor}
                width={nativeLabelWidth}
                padding={nativeLabelPadding}
                verticalPadding={nativeLabelVerticalPadding}
              />
            </Button>
          ) : (
            <Button
              modifiers={[
                frame({ width: size.width, height: size.height }),
                buttonStyle("plain"),
                glassEffect({
                  glass: { variant: glassVariant },
                  shape: "roundedRectangle",
                  cornerRadius: 32,
                }),
              ]}
            >
              <VStack
                alignment="leading"
                modifiers={[
                  frame({
                    width: size.width,
                    height: size.height,
                    alignment: "center",
                  }),
                ]}
              >
                <RNHostView matchContents>
                  <View
                    className={nativeContentClassName}
                    style={{
                      width: size.width,
                      height: contentHeight,
                    }}
                  >
                    {children}
                  </View>
                </RNHostView>
              </VStack>
            </Button>
          )}
        </Host>
      ) : null}
      {nativeGlassButton?.overlay}
    </View>
  );
}

function ButtonText({
  label,
  primaryColor,
  width,
  padding: horizontalPadding,
  verticalPadding,
}: {
  label: string;
  primaryColor: string;
  width: number;
  padding: number;
  verticalPadding: number;
}) {
  return (
    <Text
      modifiers={[
        padding({ horizontal: horizontalPadding, vertical: verticalPadding }),
        frame({ width, alignment: "center" }),
        offset({ y: 1 }),
        font({ size: 18, weight: "regular" }),
        foregroundStyle(primaryColor),
      ]}
    >
      {label}
    </Text>
  );
}
