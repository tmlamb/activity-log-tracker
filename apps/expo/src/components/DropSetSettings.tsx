import { useState } from "react";
import { View } from "react-native";
import { FadeInUp, FadeOutUp } from "react-native-reanimated";

import type { DraftAlternative } from "~/data/repositories/session-drafts";
import {
  DEFAULT_DROP_PERCENT,
  dropSetErrors,
  isDropPercentValid,
} from "~/data/domain/session-editor-draft";
import { AnimatedViewStyled } from "./Styled";
import TextInputThemed from "./TextInputThemed";

const percentText = (value: number) => String(Number((value * 100).toFixed(2)));

/** A typed percentage as a fraction; 0 (never valid) when it isn't a number. */
const percentValue = (text: string) => {
  const value = text.trim() && text !== "." ? Number(text) : NaN;
  return Number.isFinite(value) ? value / 100 : 0;
};

/**
 * How many drop sets an activity has and, while it has any, how much lighter
 * each is than the set before it. The percentage typed here is remembered
 * while the count is cleared, so setting a count again brings it back.
 */
export default function DropSetSettings({
  activity,
  showValidation,
  onChangeCount,
  onChangePercent,
}: {
  activity: Pick<DraftAlternative, "dropPercent" | "dropSets">;
  showValidation: boolean;
  /** `percent` is what drop sets start at if there were none. */
  onChangeCount: (text: string, percent: number) => void;
  onChangePercent: (value: number) => void;
}) {
  const count = activity.dropSets.length;
  const [percentInput, setPercentInput] = useState(() =>
    percentText(activity.dropPercent ?? DEFAULT_DROP_PERCENT),
  );
  const errors = dropSetErrors(activity);
  const size = count ? 2 : 1;
  return (
    <View>
      <TextInputThemed
        label="Drop Sets"
        value={count ? String(count) : ""}
        keyboardType="number-pad"
        numeric
        maxLength={1}
        placeholder="0"
        selectTextOnFocus
        stack={{ index: 0, size }}
        cardVariants={["square"]}
        onChangeText={(text) => {
          // Drop sets start from the remembered percentage, or the default if
          // it was left invalid; with drop sets already, it stays as it is.
          const remembered = percentValue(percentInput);
          if (count || isDropPercentValid(remembered))
            onChangeCount(text, remembered);
          else {
            setPercentInput(percentText(DEFAULT_DROP_PERCENT));
            onChangeCount(text, DEFAULT_DROP_PERCENT);
          }
        }}
      />
      {count > 0 && (
        <AnimatedViewStyled
          collapsable={false}
          entering={FadeInUp.duration(220)}
          exiting={FadeOutUp.duration(220)}
        >
          <TextInputThemed
            label="Drop Percentage (%)"
            value={percentInput}
            keyboardType="decimal-pad"
            numeric
            decimalPlaces={2}
            maxLength={5}
            placeholder="00.00"
            selectTextOnFocus
            stack={{ index: 1, size }}
            cardVariants={["square"]}
            error={
              showValidation && errors.dropPercent
                ? "Percentage must be between 0.01 and 99.99"
                : undefined
            }
            onChangeText={(text) => {
              setPercentInput(text);
              onChangePercent(percentValue(text));
            }}
            onBlur={() => {
              const value = percentValue(percentInput);
              setPercentInput(value > 0 ? percentText(value) : "");
            }}
          />
        </AnimatedViewStyled>
      )}
    </View>
  );
}
