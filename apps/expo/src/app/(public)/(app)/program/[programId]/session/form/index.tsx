import { SQLiteSessionForm } from "~/components/sqlite-session-form";
import { useApplicationDataRuntime } from "~/data/react/application-data";

export default function SessionFormScreen() {
  const runtime = useApplicationDataRuntime();
  return <SQLiteSessionForm runtime={runtime} />;
}
