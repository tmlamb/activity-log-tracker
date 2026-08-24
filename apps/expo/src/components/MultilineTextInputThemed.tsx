import type { Ref } from "react";
import type {
  KeyboardTypeOptions,
  TextInputChangeEvent,
  TextInputKeyPressEvent,
} from "react-native";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { FadeInDown, FadeOutDown } from "react-native-reanimated";
import { twMerge } from "tailwind-merge";

import type { variantClasses } from "./Card";
import Card from "./Card";
import { AnimatedViewStyled } from "./Styled";

const inputLineHeight = 22;
const minInputHeight = inputLineHeight;

const normalizeText = (text: string) => (/^\n+$/.test(text) ? "" : text);

function assignRef<T>(ref: Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    (ref as { current: T | null }).current = value;
  }
}

type MultilineCardVariant = Exclude<keyof typeof variantClasses, "glass">;

interface Props {
  onChangeText?: (text: string) => void;
  onChange?: (e: TextInputChangeEvent) => void;
  onBlur?: (e: unknown) => void;
  onFocus?: (e: unknown) => void;
  value?: string;
  className?: string;
  textInputClassName?: string;
  labelClassName?: string;
  label: string;
  placeholder?: string;
  maxLength?: number;
  selectTextOnFocus?: boolean;
  clearTextOnFocus?: boolean;
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
  selection?: { start: number; end?: number };
  onKeyPress?: (e: TextInputKeyPressEvent) => void;
  innerRef?: Ref<TextInput>;
  error?: string;
  errorClassName?: string;
  accessibilityLabel?: string;
  testID?: string;
  stack?: {
    index: number;
    size: number;
  };
  cardVariants?: MultilineCardVariant[];
}

export default function MultilineTextInputThemed(props: Props) {
  const isControlled = "value" in props;
  const {
    onChangeText,
    onChange,
    onBlur,
    onFocus,
    value,
    className,
    textInputClassName,
    labelClassName,
    label,
    placeholder,
    maxLength,
    selectTextOnFocus = false,
    clearTextOnFocus = false,
    keyboardType = "default",
    editable = true,
    selection,
    onKeyPress,
    innerRef,
    error,
    errorClassName,
    accessibilityLabel,
    testID,
    stack,
    cardVariants,
  } = props;
  const inputRef = useRef<TextInput | null>(null);
  const [internalValue, setInternalValue] = useState(value ?? "");
  const [inputWidth, setInputWidth] = useState(0);
  const [contentHeight, setContentHeight] = useState(minInputHeight);

  const inputValue = isControlled ? (value ?? "") : internalValue;
  const newlineHeight = Math.max(
    minInputHeight,
    inputValue.split("\n").length * inputLineHeight,
  );
  const layoutHeight = Math.max(minInputHeight, contentHeight, newlineHeight);
  const hasVisibleText = inputValue.trim().length > 0;
  const trailingNewlineHeight =
    hasVisibleText && inputValue.endsWith("\n") ? inputLineHeight : 0;
  const inputHeight = layoutHeight + trailingNewlineHeight;
  const measuredText = inputValue
    ? inputValue.endsWith("\n")
      ? `${inputValue}\u00a0`
      : inputValue
    : " ";

  const handleChangeText = (text: string) => {
    const normalizedText = normalizeText(text);

    if (!isControlled) {
      setInternalValue(normalizedText);
    }
    onChangeText?.(normalizedText);
  };

  const setInputRef = (node: TextInput | null) => {
    inputRef.current = node;
    assignRef(innerRef, node);
  };

  return (
    <View>
      <Pressable
        accessible={false}
        onPress={() => inputRef.current?.focus()}
        className="w-full"
      >
        <Card
          stack={stack}
          variants={cardVariants}
          className={twMerge(
            "h-auto flex-col items-stretch justify-start gap-1 px-5 pt-4 pb-5",
            error ? "border-destructive border" : null,
            className,
          )}
        >
          <Text
            maxFontSizeMultiplier={2}
            numberOfLines={1}
            className={twMerge(
              error
                ? "text-destructive text-xl tracking-tight"
                : "text-muted text-xl tracking-tight",
              labelClassName,
            )}
            accessible={false}
          >
            {label}
          </Text>

          <TextInput
            onChangeText={handleChangeText}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            value={inputValue}
            onLayout={(event) => {
              setInputWidth(event.nativeEvent.layout.width);
            }}
            className={twMerge(
              "text-foreground placeholder:text-muted w-full px-0 py-0 text-lg tracking-normal",
              textInputClassName,
            )}
            style={[
              styles.input,
              {
                height: inputHeight,
                marginBottom: -trailingNewlineHeight,
              },
            ]}
            placeholder={placeholder}
            maxLength={maxLength}
            keyboardType={keyboardType}
            textAlignVertical="top"
            textAlign="left"
            selectTextOnFocus={selectTextOnFocus}
            clearTextOnFocus={clearTextOnFocus}
            editable={editable}
            selection={selection}
            onKeyPress={onKeyPress}
            multiline
            scrollEnabled={false}
            ref={setInputRef}
            accessibilityLabel={accessibilityLabel ?? label}
            testID={testID}
            maxFontSizeMultiplier={2}
          />
          {inputWidth > 0 ? (
            <Text
              maxFontSizeMultiplier={2}
              className="p-0 text-lg tracking-normal"
              style={[styles.measurementText, { width: inputWidth }]}
              onLayout={(event) => {
                setContentHeight(
                  Math.ceil(event.nativeEvent.layout.height) || minInputHeight,
                );
              }}
              accessible={false}
            >
              {measuredText}
            </Text>
          ) : null}
        </Card>
      </Pressable>

      {error ? (
        <AnimatedViewStyled
          entering={FadeInDown.springify().stiffness(40).damping(6).mass(0.3)}
          exiting={FadeOutDown.springify().stiffness(40).damping(6).mass(0.3)}
          className={twMerge(
            "absolute z-10",
            cardVariants?.includes("small")
              ? "right-5 bottom-1"
              : "right-5 bottom-1",
            errorClassName,
          )}
          pointerEvents="none"
        >
          <Text
            accessibilityRole="alert"
            maxFontSizeMultiplier={2}
            className={twMerge(
              "text-destructive",
              cardVariants?.includes("small") ? "text-xs" : "text-sm",
            )}
          >
            {error}
          </Text>
        </AnimatedViewStyled>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    fontSize: 18,
    includeFontPadding: false,
    letterSpacing: 0,
    lineHeight: inputLineHeight,
    padding: 0,
    textAlign: "left",
    textAlignVertical: "top",
  },
  measurementText: {
    fontSize: 18,
    includeFontPadding: false,
    left: 0,
    letterSpacing: 0,
    lineHeight: inputLineHeight,
    opacity: 0,
    padding: 0,
    position: "absolute",
    top: 0,
    zIndex: -1,
  },
});
