import { View } from "react-native";
import { Link, Stack } from "expo-router";

import type { ApplicationDataRuntime } from "~/data/react/application-data";
import type { ProgramSummary } from "~/data/repositories/programs";
import { NavigationCardRow } from "~/components/CardRow";
import { HeaderPlusAction } from "~/components/HeaderAction";
import { SQLiteQueryStatus } from "~/components/sqlite-query-status";
import { LegendListStyled } from "~/components/Styled";
import { useApplicationDataRuntime } from "~/data/react/application-data";
import { useProgramSummaries } from "~/data/react/program-queries";

export default function ProgramSettingsScreen() {
  const runtime = useApplicationDataRuntime();
  return <SQLiteProgramSettings runtime={runtime} />;
}

function SQLiteProgramSettings({
  runtime,
}: {
  runtime: ApplicationDataRuntime;
}) {
  const query = useProgramSummaries(runtime);
  if (query.data === undefined)
    return (
      <SQLiteQueryStatus
        error={query.isError}
        onRetry={() => void query.refetch()}
      />
    );
  return <ProgramSettingsContent programs={query.data} />;
}

function ProgramSettingsContent({ programs }: { programs: ProgramSummary[] }) {
  return (
    <View className="flex-1">
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/(public)/(app)/program/form" asChild>
              <HeaderPlusAction
                disabled={programs.length > 100}
                accessibilityLabel="Navigate to Create Workout Program Form"
              />
            </Link>
          ),
        }}
      />
      <LegendListStyled
        className="flex-1"
        contentContainerClassName="px-5 pt-5"
        contentInsetAdjustmentBehavior="automatic"
        recycleItems={false}
        maintainVisibleContentPosition={false}
        data={programs}
        estimatedItemSize={53}
        extraData={programs.length}
        keyExtractor={(item) => item.id}
        renderItem={({ index, item }) => (
          <Link
            href={`/(public)/(app)/program/form?programId=${encodeURIComponent(item.id)}`}
            asChild
          >
            <NavigationCardRow
              title={item.name}
              cardVariants={["multiline"]}
              stack={{ index, size: programs.length }}
              trailingText={`${item.sessionCount} session${item.sessionCount !== 1 ? "s" : ""}`}
              accessibilityLabel={`Navigate to Edit Workout Program ${item.name}`}
            />
          </Link>
        )}
      />
    </View>
  );
}
