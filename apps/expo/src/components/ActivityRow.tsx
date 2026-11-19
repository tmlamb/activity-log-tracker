import { View } from "react-native";
import { FadeInUp, FadeOutUp } from "react-native-reanimated";
import { AntDesign, Feather } from "@expo/vector-icons";

import type { DraftAlternative } from "~/data/repositories/session-drafts";
import type { SessionEditorExercise } from "~/data/repositories/session-editor";
import { activityErrors } from "~/data/domain/session-editor-draft";
import Card from "./Card";
import { NavigationCardRow } from "./CardRow";
import { Text } from "./font-scale-text";
import NumberDraftInput from "./NumberDraftInput";
import PressableThemed from "./PressableThemed";
import { AnimatedViewStyled } from "./Styled";
import TextInputThemed from "./TextInputThemed";

export function exerciseLabel(
  exercise: SessionEditorExercise | undefined,
  exerciseId: string | null,
) {
  return exercise
    ? `${exercise.name}${exercise.deleted ? " (Deleted)" : ""}`
    : exerciseId
      ? "Unavailable exercise"
      : "Select Exercise";
}

function loadLabel(activity: DraftAlternative) {
  if (activity.loadType === null || activity.loadValue === null)
    return "Unavailable";
  return activity.loadType === "PERCENT"
    ? `${Number((activity.loadValue * 100).toFixed(2))}%`
    : `RPE ${activity.loadValue}`;
}

/**
 * One full-bleed planned exercise row: exercise, reorder and remove controls
 * on the left; set counts, reps, rest and load on the right. Used for session
 * activities and for their alternatives.
 */
export default function ActivityRow({
  activity,
  exercise,
  stack,
  showValidation,
  canMoveUp,
  canMoveDown,
  removeLabel = "Remove exercise from Session",
  alternativeCount = 0,
  onSelectExercise,
  onSelectLoad,
  onRemove,
  onMoveUp,
  onMoveDown,
  onChangeSetCount,
  onChange,
  onOpenAdvanced,
}: {
  activity: DraftAlternative;
  exercise: SessionEditorExercise | undefined;
  stack: { index: number; size: number };
  showValidation: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  removeLabel?: string;
  alternativeCount?: number;
  onSelectExercise: () => void;
  onSelectLoad: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChangeSetCount: (kind: "Warmup" | "Main", text: string) => void;
  onChange: (
    update: Partial<Pick<DraftAlternative, "reps" | "restMinutes">>,
  ) => void;
  /** Shows the advanced settings gear when provided. */
  onOpenAdvanced?: () => void;
}) {
  const errors = activityErrors(activity);
  const exerciseError = showValidation && errors.exercise;
  const setsError = showValidation && errors.sets ? "Required" : undefined;
  return (
    <AnimatedViewStyled
      collapsable={false}
      entering={FadeInUp.duration(220)}
      exiting={FadeOutUp.duration(220)}
    >
      <Card
        className="h-auto flex-row items-stretch gap-0 rounded-none p-0"
        variants={["square"]}
        stack={stack}
      >
        <View
          className={
            exerciseError
              ? "relative z-10 flex-initial basis-1/2 justify-evenly"
              : "border-border relative flex-initial basis-1/2 justify-evenly border-r"
          }
        >
          {exerciseError && (
            <View
              pointerEvents="none"
              className="border-destructive absolute inset-0 z-10 border"
            />
          )}
          <View className="relative py-2 pb-6">
            <PressableThemed
              accessibilityLabel="Navigate to select exercise form"
              onPress={onSelectExercise}
            >
              <View className="h-auto w-full flex-row items-center justify-between gap-2 pr-3 pl-5">
                <View className="flex-1">
                  <Text
                    maxFontSizeMultiplier={2.5}
                    className={
                      exerciseError
                        ? "text-destructive text-xl leading-tight"
                        : exercise
                          ? "text-foreground text-xl leading-tight"
                          : "text-primary text-xl leading-tight"
                    }
                  >
                    {exerciseLabel(exercise, activity.exerciseId)}
                  </Text>
                  {alternativeCount > 0 && (
                    <Text
                      maxFontSizeMultiplier={2}
                      className="text-muted text-base leading-tight"
                    >
                      {`${alternativeCount} Alternative${alternativeCount === 1 ? "" : "s"}`}
                    </Text>
                  )}
                </View>
                <Text
                  maxFontSizeMultiplier={2.5}
                  className="text-muted text-xl"
                >
                  <AntDesign name="right" size={15} />
                </Text>
              </View>
            </PressableThemed>
            {exerciseError && (
              <Text
                accessibilityRole="alert"
                maxFontSizeMultiplier={2}
                className="text-destructive absolute bottom-2.5 left-5 z-10 text-sm"
              >
                Required
              </Text>
            )}
          </View>
          <PressableThemed
            className="absolute top-1 left-2 p-2"
            hitSlop={20}
            accessibilityLabel={removeLabel}
            onPress={onRemove}
          >
            <Text
              maxFontSizeMultiplier={2.5}
              className="text-destructive text-xl"
            >
              <Feather name="trash-2" size={20} />
            </Text>
          </PressableThemed>
          {onOpenAdvanced && (
            <PressableThemed
              className="absolute top-1 right-2 p-2"
              hitSlop={20}
              accessibilityLabel="Navigate to advanced activity settings form"
              onPress={onOpenAdvanced}
            >
              <Text maxFontSizeMultiplier={2.5} className="text-muted text-xl">
                <Feather name="settings" size={20} />
              </Text>
            </PressableThemed>
          )}
          {canMoveUp && (
            <PressableThemed
              className="absolute top-2 self-center p-2 opacity-50"
              accessibilityLabel="Move exercise up"
              onPress={onMoveUp}
            >
              <Text maxFontSizeMultiplier={2.5} className="text-muted">
                <AntDesign name="up" size={15} />
              </Text>
            </PressableThemed>
          )}
          {canMoveDown && (
            <PressableThemed
              className="absolute bottom-2 self-center p-2 opacity-50"
              accessibilityLabel="Move exercise down"
              onPress={onMoveDown}
            >
              <Text maxFontSizeMultiplier={2.5} className="text-muted">
                <AntDesign name="down" size={15} />
              </Text>
            </PressableThemed>
          )}
        </View>
        <View className="flex-initial basis-1/2 justify-between">
          <TextInputThemed
            label="Warmup Sets"
            value={
              activity.warmupSets.length
                ? String(activity.warmupSets.length)
                : ""
            }
            keyboardType="number-pad"
            numeric
            maxLength={1}
            placeholder="0"
            selectTextOnFocus
            stack={{ index: 0, size: 5 }}
            cardVariants={["square", "small", "transparent"]}
            error={setsError}
            onChangeText={(value) => onChangeSetCount("Warmup", value)}
          />
          <TextInputThemed
            label="Main Sets"
            value={
              activity.mainSets.length ? String(activity.mainSets.length) : ""
            }
            keyboardType="number-pad"
            numeric
            maxLength={2}
            placeholder="0"
            selectTextOnFocus
            stack={{ index: 1, size: 5 }}
            cardVariants={["square", "small", "transparent"]}
            error={setsError}
            onChangeText={(value) => onChangeSetCount("Main", value)}
          />
          <NumberDraftInput
            key={`${activity.id}:reps`}
            compact
            stack={{ index: 2, size: 5 }}
            maxLength={2}
            label="Repetitions"
            value={activity.reps}
            error={showValidation && errors.reps ? "Required" : undefined}
            onChange={(reps) => onChange({ reps })}
          />
          <NumberDraftInput
            key={`${activity.id}:rest`}
            compact
            stack={{ index: 3, size: 5 }}
            maxLength={2}
            label="Rest (minutes)"
            value={activity.restMinutes}
            onChange={(restMinutes) => onChange({ restMinutes })}
          />
          <NavigationCardRow
            title="Load"
            trailingText={loadLabel(activity)}
            stack={{ index: 4, size: 5 }}
            cardVariants={["square", "small"]}
            titleClassName="pr-0"
            onPress={onSelectLoad}
            accessibilityLabel="Navigate to select exercise load form"
          />
        </View>
      </Card>
    </AnimatedViewStyled>
  );
}
