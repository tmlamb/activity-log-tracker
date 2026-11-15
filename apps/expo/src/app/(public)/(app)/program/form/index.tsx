import { SQLiteProgramForm } from "~/components/sqlite-program-form";
import { useApplicationDataRuntime } from "~/data/react/application-data";

export default function ProgramFormScreen() {
  const runtime = useApplicationDataRuntime();
  return <SQLiteProgramForm runtime={runtime} />;
}
