import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams } from "expo-router";

import { afterNextPaint } from "~/components/BusyOverlay";
import MissingDataRedirect from "~/components/MissingDataRedirect";
import ProgramInsights from "~/components/program-insights";
import { presentProgramInsights } from "~/data/insight-presenters";
import { useProgramInsights } from "~/data/queries";

/**
 * Insights total every set in the program, which takes a moment for long
 * histories. Show a spinner first so the screen opens immediately.
 */
export default function ProgramInsightsScreen() {
  const { programId } = useLocalSearchParams<{ programId: string }>();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    void afterNextPaint().then(() => {
      if (mounted) setReady(true);
    });
    return () => {
      mounted = false;
    };
  }, []);
  if (!ready)
    return (
      <View
        className="flex-1 items-center justify-center"
        accessibilityLabel="Loading insights"
      >
        <ActivityIndicator size="large" />
      </View>
    );
  return <ProgramInsightsContent programId={programId} />;
}

function ProgramInsightsContent({ programId }: { programId: string }) {
  const projection = useProgramInsights(programId);
  const insights = useMemo(
    () => (projection ? presentProgramInsights(projection) : null),
    [projection],
  );
  if (!projection || !insights) return <MissingDataRedirect />;
  return (
    <ProgramInsights
      programName={projection.programName}
      insights={insights}
      partial={projection.partial}
    />
  );
}
