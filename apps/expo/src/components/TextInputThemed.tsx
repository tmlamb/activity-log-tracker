import type {
  KeyboardTypeOptions,
  LayoutChangeEvent,
  TextInputChangeEvent,
  TextInputKeyPressEvent,
} from "react-native";
import {
  createContext,
  use,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { FadeInRight, FadeOutRight } from "react-native-reanimated";
import Feather from "@expo/vector-icons/Feather";
import { twMerge } from "tailwind-merge";

import type { variantClasses } from "./Card";
import Card from "./Card";
import { AnimatedViewStyled } from "./Styled";

// When text in an input is right-justified, trailing whitespace is visually ignored.
// &nbsp; (\u00a0) does not behave this way, so we swap them in.
const nbspReplace = (str: string) => str.replace(/\u0020/g, "\u00a0");

// Prevents non-numeric values in numeric fields and keeps decimal input stable.
const numericReplace = (str: string, decimalPlaces?: number) => {
  const cleaned = str.replace(/[^0-9.]/g, "");
  const [integerRaw = "", ...fractionParts] = cleaned.split(".");
  const integer = integerRaw.replace(/^0+(?=\d)/g, "");

  if (!cleaned.includes(".")) return integer;

  const fraction = fractionParts.join("");
  const normalizedFraction =
    decimalPlaces != null ? fraction.slice(0, decimalPlaces) : fraction;

  return `${integer}.${normalizedFraction}`;
};

function assignRef<T>(ref: React.Ref<T> | undefined, value: T | null) {
  if (typeof ref === "function") {
    ref(value);
    return;
  }

  if (ref) {
    (ref as { current: T | null }).current = value;
  }
}

interface TextInputThemedGroupContextValue {
  registerLabelWidth: (id: string, width: number) => void;
  unregisterLabelWidth: (id: string) => void;
  consistentPaddingLeft?: number;
}

interface TextInputThemedLabelSpacing {
  isGrouped: boolean;
  paddingLeft?: number;
  setLabelWidth: (width: number) => void;
}

type FeatherIconName = keyof typeof Feather.glyphMap;

interface Props {
  onChangeText?: (text: string) => void;
  onChange?: (e: TextInputChangeEvent) => void;
  onBlur?: (e: unknown) => void;
  onFocus?: (e: unknown) => void;
  value?: string;
  className?: string;
  textInputClassName?: string;
  labelClassName?: string;
  label?: string;
  leftIconName?: FeatherIconName;
  placeholder?: string;
  maxLength?: number;
  selectTextOnFocus?: boolean;
  clearTextOnFocus?: boolean;
  keyboardType?: KeyboardTypeOptions;
  numeric?: boolean;
  decimalPlaces?: number;
  editable?: boolean;
  selection?: { start: number; end?: number };
  onKeyPress?: (e: TextInputKeyPressEvent) => void;
  innerRef?: React.Ref<TextInput>;
  error?: string;
  errorClassName?: string;
  accessibilityLabel?: string;
  testID?: string;
  stack?: {
    index: number;
    size: number;
  };
  cardVariants?: (keyof typeof variantClasses)[];
}

const TextInputThemedGroupContext =
  createContext<TextInputThemedGroupContextValue | null>(null);

export const gapAfterLabel = 32;

let nextTextInputThemedFieldId = 0;

export function useTextInputThemedLabelSpacing(
  enabled: boolean,
): TextInputThemedLabelSpacing {
  const group = use(TextInputThemedGroupContext);
  const inputIdRef = useRef(
    `text-input-themed-${nextTextInputThemedFieldId++}`,
  );
  const [labelWidth, setLabelWidth] = useState(0);

  const actualSpaceForLabel = useMemo(() => {
    if (!enabled) return undefined;

    return labelWidth + gapAfterLabel;
  }, [enabled, labelWidth]);

  useEffect(() => {
    if (!group || !actualSpaceForLabel) return;

    const inputId = inputIdRef.current;

    group.registerLabelWidth(inputId, actualSpaceForLabel - gapAfterLabel);

    return () => {
      group.unregisterLabelWidth(inputId);
    };
  }, [actualSpaceForLabel, group]);

  return {
    isGrouped: group != null,
    paddingLeft: group?.consistentPaddingLeft ?? actualSpaceForLabel,
    setLabelWidth,
  };
}

export function TextInputThemedGroup({
  children,
}: {
  children: React.ReactNode;
}) {
  const [labelWidths, setLabelWidths] = useState<Record<string, number>>({});

  const registerLabelWidth = (id: string, width: number) => {
    setLabelWidths((current) => {
      if (current[id] === width) return current;

      return {
        ...current,
        [id]: width,
      };
    });
  };

  const unregisterLabelWidth = (id: string) => {
    setLabelWidths((current) => {
      if (!(id in current)) return current;

      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const consistentPaddingLeft = useMemo(() => {
    const longestLabelWidth = Math.max(0, ...Object.values(labelWidths));

    return longestLabelWidth > 0
      ? longestLabelWidth + gapAfterLabel
      : undefined;
  }, [labelWidths]);

  const value = useMemo(
    () => ({
      registerLabelWidth,
      unregisterLabelWidth,
      consistentPaddingLeft,
    }),
    [consistentPaddingLeft],
  );

  return (
    <TextInputThemedGroupContext value={value}>
      {children}
    </TextInputThemedGroupContext>
  );
}

export default function TextInputThemed({
  onChangeText,
  onChange,
  onBlur,
  onFocus,
  value,
  className,
  textInputClassName,
  labelClassName,
  label,
  leftIconName,
  placeholder,
  maxLength,
  selectTextOnFocus = false,
  clearTextOnFocus = false,
  keyboardType = "default",
  numeric = false,
  decimalPlaces,
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
}: Props) {
  const inputRef = useRef<TextInput | null>(null);
  const { isGrouped, paddingLeft, setLabelWidth } =
    useTextInputThemedLabelSpacing(label != null || leftIconName != null);

  const handleChange = (text: string) => {
    const normalizedText = numeric
      ? numericReplace(text, decimalPlaces)
      : nbspReplace(text);
    onChangeText?.(normalizedText);
  };
  const textAlign = isGrouped && numeric ? "left" : numeric ? "right" : "left";
  const maskDecimalText = numeric && decimalPlaces != null;

  const setInputRef = (node: TextInput | null) => {
    inputRef.current = node;
    assignRef(innerRef, node);
  };

  return (
    <Pressable
      accessible={false}
      onPress={() => {
        if (editable) inputRef.current?.focus();
      }}
      className={twMerge("relative flex-row items-center")}
    >
      {(!!label || !!leftIconName) && (
        <Text
          onLayout={(event: LayoutChangeEvent) => {
            setLabelWidth(Math.ceil(event.nativeEvent.layout.width));
          }}
          maxFontSizeMultiplier={2}
          className={twMerge(
            error
              ? "text-destructive absolute left-5 z-1 text-xl tracking-tight"
              : "text-muted absolute left-5 z-1 text-xl tracking-tight",
            labelClassName,
          )}
          accessible={false}
        >
          {leftIconName && (
            <Text
              className={twMerge(
                error ? "text-destructive" : "text-muted",
                "h-10 w-10",
              )}
            >
              <Feather name={leftIconName} size={18} />
            </Text>
          )}
          {label}
        </Text>
      )}
      <Card
        stack={stack}
        variants={cardVariants}
        className={twMerge(
          error ? "border-destructive border" : null,
          className,
        )}
      >
        {maskDecimalText ? (
          <View
            pointerEvents="none"
            accessible={false}
            className="absolute inset-y-0 right-5 left-5 z-10 justify-center"
          >
            <Text
              maxFontSizeMultiplier={2}
              className={twMerge(
                "text-xl leading-loose tracking-normal",
                value ? "text-foreground" : "text-muted",
              )}
              style={{ paddingLeft, textAlign }}
            >
              {value?.length ? value : placeholder}
            </Text>
          </View>
        ) : null}
        <TextInput
          onChangeText={handleChange}
          onChange={onChange}
          onFocus={onFocus}
          onBlur={onBlur}
          value={value}
          className={twMerge(
            "text-foreground placeholder:text-muted z-20 flex-1 flex-row items-center justify-center text-xl leading-loose tracking-normal",
            textInputClassName,
          )}
          style={{
            paddingLeft,
            color: maskDecimalText ? "transparent" : undefined,
          }}
          placeholder={maskDecimalText ? "" : placeholder}
          maxLength={maxLength}
          keyboardType={keyboardType}
          textAlignVertical="center"
          textAlign={textAlign}
          selectTextOnFocus={selectTextOnFocus}
          clearTextOnFocus={clearTextOnFocus}
          editable={editable}
          selection={selection}
          onKeyPress={onKeyPress}
          numberOfLines={1}
          scrollEnabled={false}
          submitBehavior="blurAndSubmit"
          ref={setInputRef}
          accessibilityLabel={accessibilityLabel ?? label}
          testID={testID}
          maxFontSizeMultiplier={2}
        />
      </Card>
      {error && (
        <AnimatedViewStyled
          entering={FadeInRight.springify().stiffness(40).damping(6).mass(0.3)}
          exiting={FadeOutRight.springify().stiffness(40).damping(6).mass(0.3)}
          pointerEvents="none"
          className={twMerge(
            "absolute z-10",
            cardVariants?.includes("small")
              ? "right-5 bottom-1"
              : "right-5 bottom-1",
            errorClassName,
          )}
        >
          <Text
            accessibilityRole="alert"
            className={twMerge(
              "text-destructive",
              cardVariants?.includes("small") ? "text-xs" : "text-sm",
            )}
            maxFontSizeMultiplier={2}
          >
            {error}
          </Text>
        </AnimatedViewStyled>
      )}
    </Pressable>
  );
}
