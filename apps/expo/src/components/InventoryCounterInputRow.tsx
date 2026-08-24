import type { KeyboardTypeOptions, LayoutChangeEvent } from "react-native";
import { useRef, useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { Entypo, Feather } from "@expo/vector-icons";
import { twMerge } from "tailwind-merge";

import Card from "./Card";
import PressableThemed from "./PressableThemed";

interface CardRowStack {
  index: number;
  size: number;
}

interface InventoryCounterInputRowBaseProps {
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: (event: unknown) => void;
  unit: string;
  inputAccessibilityLabel: string;
  placeholder?: string;
  maxLength?: number;
  keyboardType?: KeyboardTypeOptions;
  error?: string;
  stack?: CardRowStack;
}

type InventoryCounterInputRowProps = InventoryCounterInputRowBaseProps &
  (
    | {
        trailing: {
          type: "counter";
          count: number;
          countUnit: string;
          onDecrement: () => void;
          onIncrement: () => void;
          decrementAccessibilityLabel: string;
          incrementAccessibilityLabel: string;
          decrementAccessibilityHint?: string;
          incrementAccessibilityHint?: string;
        };
      }
    | {
        trailing: {
          type: "remove";
          label?: string;
          onRemove: () => void;
          removeAccessibilityLabel: string;
          removeAccessibilityHint?: string;
        };
      }
  );

export default function InventoryCounterInputRow({
  value,
  onChangeText,
  onBlur,
  unit,
  inputAccessibilityLabel,
  placeholder,
  maxLength,
  keyboardType = "decimal-pad",
  error,
  stack,
  trailing,
}: InventoryCounterInputRowProps) {
  const inputRef = useRef<TextInput | null>(null);
  const [inputWidth, setInputWidth] = useState(3);
  const countText =
    trailing.type === "counter"
      ? `${trailing.count} ${trailing.countUnit}`
      : undefined;
  const measuredInputText = value.length > 0 ? value : (placeholder ?? "");
  const accessibilityValueText = value ? `${value} ${unit}` : undefined;

  const confirmRemoval = (onConfirm: () => void) => {
    Alert.alert(
      "Remove Inventory Item?",
      "Are you sure you want to remove this item from your equipment inventory?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: onConfirm },
      ],
    );
  };

  const handleInputTextLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.ceil(event.nativeEvent.layout.width) + 3;

    setInputWidth((currentWidth) =>
      currentWidth === nextWidth ? currentWidth : nextWidth,
    );
  };

  return (
    <View className="relative">
      <Card
        stack={stack}
        className={twMerge(
          "h-[53px] items-center px-5 py-0",
          error ? "border-destructive border" : null,
        )}
      >
        <Pressable
          accessible={false}
          onPress={() => inputRef.current?.focus()}
          className="relative min-w-0 basis-1/2 flex-row items-center self-stretch"
        >
          <Text
            accessible={false}
            pointerEvents="none"
            onLayout={handleInputTextLayout}
            className="text-foreground absolute text-xl leading-normal font-semibold opacity-0"
          >
            {measuredInputText}
          </Text>
          <View className="h-10 w-24 justify-center">
            {!value && placeholder ? (
              <Text
                accessible={false}
                pointerEvents="none"
                className="text-muted text-xl leading-normal font-semibold"
              >
                {placeholder}
              </Text>
            ) : null}
            <TextInput
              ref={inputRef}
              onChangeText={onChangeText}
              onBlur={onBlur}
              value={value}
              placeholder=""
              maxLength={maxLength}
              selectTextOnFocus
              keyboardType={keyboardType}
              className="text-foreground absolute inset-0 h-10 w-full py-0 text-xl leading-normal font-semibold"
              style={{ paddingVertical: 0 }}
              textAlignVertical="center"
              numberOfLines={1}
              scrollEnabled={false}
              submitBehavior="blurAndSubmit"
              accessibilityLabel={inputAccessibilityLabel}
              accessibilityValue={
                accessibilityValueText
                  ? { text: accessibilityValueText }
                  : undefined
              }
              maxFontSizeMultiplier={2}
            />
          </View>
          <View
            pointerEvents="none"
            className="absolute inset-y-0 justify-center"
            style={{ left: inputWidth }}
          >
            <Text maxFontSizeMultiplier={2.5} className="text-muted text-xl">
              {unit}
            </Text>
          </View>
        </Pressable>

        <View className="min-w-0 flex-1 flex-row items-center justify-end gap-1.5">
          {trailing.type === "counter" ? (
            <>
              <PressableThemed
                className="h-11 w-11 items-center justify-center rounded-full"
                onPress={() => {
                  if (trailing.count <= 0) {
                    confirmRemoval(trailing.onDecrement);
                    return;
                  }
                  trailing.onDecrement();
                }}
                accessibilityLabel={trailing.decrementAccessibilityLabel}
                accessibilityHint={trailing.decrementAccessibilityHint}
                accessibilityValue={{
                  now: trailing.count,
                  text: countText,
                }}
              >
                <Text
                  maxFontSizeMultiplier={2.5}
                  className={twMerge(
                    "text-xl font-semibold",
                    trailing.count <= 0 ? "text-destructive" : "text-muted",
                  )}
                >
                  {trailing.count <= 0 ? (
                    <Feather name="trash-2" size={20} />
                  ) : (
                    <Entypo name="circle-with-minus" size={20} />
                  )}
                </Text>
              </PressableThemed>
              <View
                className="min-w-20 flex-row items-baseline justify-center gap-1"
                accessible
                accessibilityLabel={countText}
                accessibilityLiveRegion="polite"
              >
                <Text
                  maxFontSizeMultiplier={2.5}
                  className="text-foreground text-right text-xl tabular-nums"
                >
                  {trailing.count}
                </Text>
                <Text
                  maxFontSizeMultiplier={2.5}
                  className="text-muted text-xl"
                >
                  {trailing.countUnit}
                </Text>
              </View>
              <PressableThemed
                className="h-11 w-11 items-center justify-center rounded-full"
                onPress={trailing.onIncrement}
                accessibilityLabel={trailing.incrementAccessibilityLabel}
                accessibilityHint={trailing.incrementAccessibilityHint}
                accessibilityValue={{
                  now: trailing.count,
                  text: countText,
                }}
              >
                <Text
                  maxFontSizeMultiplier={2.5}
                  className="text-muted text-xl font-semibold"
                >
                  <Entypo name="circle-with-plus" size={20} />
                </Text>
              </PressableThemed>
            </>
          ) : (
            <>
              {trailing.label ? (
                <Text
                  maxFontSizeMultiplier={2.5}
                  className="text-muted text-xl"
                >
                  {trailing.label}
                </Text>
              ) : null}
              <PressableThemed
                className="h-11 w-11 items-center justify-center rounded-full"
                onPress={() => confirmRemoval(trailing.onRemove)}
                accessibilityLabel={trailing.removeAccessibilityLabel}
                accessibilityHint={trailing.removeAccessibilityHint}
              >
                <Text
                  maxFontSizeMultiplier={2.5}
                  className="text-destructive text-xl font-semibold"
                >
                  <Feather name="trash-2" size={20} />
                </Text>
              </PressableThemed>
            </>
          )}
        </View>
      </Card>
      {error ? (
        <Text
          accessibilityRole="alert"
          maxFontSizeMultiplier={2}
          className="text-destructive absolute bottom-1 left-5 z-10 text-sm font-medium"
        >
          {error}
        </Text>
      ) : null}
    </View>
  );
}
