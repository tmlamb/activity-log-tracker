import { SQLiteSessionSelect } from "~/components/sqlite-session-select";
import { useApplicationDataRuntime } from "~/data/react/application-data";

export default function SessionSelectScreen() {
  const runtime = useApplicationDataRuntime();
  return <SQLiteSessionSelect runtime={runtime} />;
}
