import { SQLiteSetScreen } from "~/components/sqlite-set-screen";
import { useApplicationDataRuntime } from "~/data/react/application-data";

export default function WorkoutSetDetailScreen() {
  const runtime = useApplicationDataRuntime();
  return <SQLiteSetScreen runtime={runtime} />;
}
