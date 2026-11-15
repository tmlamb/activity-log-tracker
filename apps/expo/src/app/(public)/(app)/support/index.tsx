import { SQLiteSupport } from "~/components/sqlite-support";
import { useApplicationDataRuntime } from "~/data/react/application-data";

export default function SupportScreen() {
  const runtime = useApplicationDataRuntime();
  return <SQLiteSupport runtime={runtime} />;
}
