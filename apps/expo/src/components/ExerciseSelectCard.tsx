import { AntDesign } from "@expo/vector-icons";

import type { SessionEditorExercise } from "~/data/repositories/session-editor";
import { DetailCardRow } from "./CardRow";
import { exerciseLabel } from "./exercise-label";
import { Text } from "./font-scale-text";
import PressableThemed from "./PressableThemed";

/** A full-bleed card naming the selected exercise; pressing it changes it. */
export default function ExerciseSelectCard({
  exercise,
  exerciseId,
  onPress,
}: {
  exercise: SessionEditorExercise | undefined;
  exerciseId: string | null;
  onPress: () => void;
}) {
  return (
    <PressableThemed
      accessibilityRole="button"
      accessibilityLabel="Navigate to select exercise form"
      onPress={onPress}
    >
      <DetailCardRow
        label="Exercise Name"
        labelClassName="text-muted"
        value={exerciseLabel(exercise, exerciseId)}
        valueClassName={exercise ? "text-foreground" : "text-primary"}
        cardVariants={["square", "multiline"]}
        trailingAccessory={
          <Text maxFontSizeMultiplier={2.5} className="text-muted text-xl">
            <AntDesign name="right" size={15} />
          </Text>
        }
      />
    </PressableThemed>
  );
}
