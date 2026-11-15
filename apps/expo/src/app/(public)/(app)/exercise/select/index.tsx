import { SQLiteExerciseSelect } from "~/components/sqlite-exercise-select";
import { useApplicationDataRuntime } from "~/data/react/application-data";

export default function ExerciseSelectScreen() {
  const runtime = useApplicationDataRuntime();
  return <SQLiteExerciseSelect runtime={runtime} />;
}
