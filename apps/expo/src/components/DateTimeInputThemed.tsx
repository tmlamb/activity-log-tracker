import { useState } from "react";
import { Modal, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import { format } from "date-fns";

import type { variantClasses } from "./Card";
import { NavigationCardRow } from "./CardRow";
import { HeaderTextAction } from "./HeaderAction";

type DateTimeInputMode = "date" | "time";

interface DateTimeInputThemedProps {
  label: string;
  value: Date;
  mode: DateTimeInputMode;
  onChange: (value: Date) => void;
  displayFormat?: string;
  accessibilityLabel?: string;
  testID?: string;
  className?: string;
  cardVariants?: (keyof typeof variantClasses)[];
  stack?: React.ComponentProps<typeof NavigationCardRow>["stack"];
}

const mergePickerValue = (
  current: Date,
  selected: Date,
  mode: DateTimeInputMode,
) => {
  const next = new Date(current);

  if (mode === "date") {
    next.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
    );
  } else {
    next.setHours(selected.getHours(), selected.getMinutes());
  }

  return next;
};

export default function DateTimeInputThemed({
  label,
  value,
  mode,
  onChange,
  displayFormat = mode === "date" ? "MMM d, yyyy" : "h:mm aa",
  accessibilityLabel,
  testID,
  className,
  cardVariants,
  stack,
}: DateTimeInputThemedProps) {
  const insets = useSafeAreaInsets();
  const [pickerVisible, setPickerVisible] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const displayedValue = format(value, displayFormat);

  const openPicker = () => {
    setDraftValue(value);
    setPickerVisible(true);
  };

  const dismissPicker = () => setPickerVisible(false);

  return (
    <>
      <NavigationCardRow
        title={label}
        trailingText={displayedValue}
        titleClassName="text-muted"
        trailingTextClassName="text-foreground"
        showChevron={false}
        onPress={openPicker}
        accessibilityLabel={
          accessibilityLabel ??
          `Change ${label.toLowerCase()}, currently ${displayedValue}`
        }
        accessibilityHint={`Opens the ${mode} picker`}
        accessibilityValue={{ text: displayedValue }}
        testID={testID}
        className={className}
        cardVariants={cardVariants}
        stack={stack}
      />

      {Platform.OS === "android" && pickerVisible && (
        <DateTimePicker
          value={value}
          mode={mode}
          presentation="dialog"
          positiveButton={{ label: "Done" }}
          negativeButton={{ label: "Cancel" }}
          onValueChange={(_, selected) => {
            dismissPicker();
            onChange(mergePickerValue(value, selected, mode));
          }}
          onDismiss={dismissPicker}
          testID={testID ? `${testID}-picker` : undefined}
        />
      )}

      {Platform.OS !== "android" && (
        <Modal
          visible={pickerVisible}
          transparent
          animationType="fade"
          presentationStyle="overFullScreen"
          statusBarTranslucent
          onRequestClose={dismissPicker}
        >
          <View
            className="flex-1 justify-end bg-black/50"
            accessibilityViewIsModal
          >
            <Pressable
              className="absolute inset-0"
              onPress={dismissPicker}
              accessible={false}
            />
            <View
              className="bg-background overflow-hidden rounded-t-4xl"
              style={{ paddingBottom: Math.max(insets.bottom, 12) }}
            >
              <View className="border-border relative h-16 flex-row items-center justify-between border-b px-2">
                <HeaderTextAction
                  label="Cancel"
                  color="foreground"
                  onPress={dismissPicker}
                  accessibilityLabel={`Cancel changing ${label.toLowerCase()}`}
                />
                <Text
                  className="text-foreground absolute right-24 left-24 text-center text-xl font-bold"
                  numberOfLines={1}
                  maxFontSizeMultiplier={2}
                >
                  {label}
                </Text>
                <HeaderTextAction
                  label="Done"
                  weight="bold"
                  onPress={() => {
                    dismissPicker();
                    onChange(draftValue);
                  }}
                  accessibilityLabel={`Save ${label.toLowerCase()}`}
                />
              </View>
              <DateTimePicker
                value={draftValue}
                mode={mode}
                display="spinner"
                style={{ height: 216 }}
                onValueChange={(_, selected) =>
                  setDraftValue((current) =>
                    mergePickerValue(current, selected, mode),
                  )
                }
                testID={testID ? `${testID}-picker` : undefined}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}
