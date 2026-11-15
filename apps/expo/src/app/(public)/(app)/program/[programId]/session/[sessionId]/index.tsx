import { SQLiteSessionDetail } from "~/components/sqlite-session-detail";
import { useApplicationDataRuntime } from "~/data/react/application-data";

export default function SessionDetailScreen() {
  const runtime = useApplicationDataRuntime();
  return <SQLiteSessionDetail runtime={runtime} />;
}
