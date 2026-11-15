import { SQLiteProgramDetail } from "~/components/sqlite-program-detail";
import { useApplicationDataRuntime } from "~/data/react/application-data";

export default function ProgramDetailScreen() {
  const runtime = useApplicationDataRuntime();
  return <SQLiteProgramDetail runtime={runtime} />;
}
