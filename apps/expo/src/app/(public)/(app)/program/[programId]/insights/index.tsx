import { useMemo } from "react";
import { Redirect, useLocalSearchParams } from "expo-router";

import type { ApplicationDataRuntime } from "~/data/react/application-data";
import ProgramInsights from "~/components/program-insights";
import { SQLiteQueryStatus } from "~/components/sqlite-query-status";
import { useApplicationDataRuntime } from "~/data/react/application-data";
import { presentProgramInsights } from "~/data/react/insight-presenters";
import { useProgramInsights } from "~/data/react/insight-queries";

export default function ProgramInsightsScreen() {
  const runtime = useApplicationDataRuntime();
  return <SQLiteProgramInsights runtime={runtime} />;
}

function SQLiteProgramInsights({
  runtime,
}: {
  runtime: ApplicationDataRuntime;
}) {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const query = useProgramInsights(runtime, programId);
  const insights = useMemo(
    () => (query.data ? presentProgramInsights(query.data) : null),
    [query.data],
  );
  if (query.data === undefined)
    return (
      <SQLiteQueryStatus
        error={query.isError}
        onRetry={() => void query.refetch()}
      />
    );
  if (!query.data || !insights) return <Redirect href="/(public)/(app)" />;
  return (
    <ProgramInsights
      programName={query.data.programName}
      insights={insights}
      partial={query.data.partial}
    />
  );
}
