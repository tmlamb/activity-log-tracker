import { FlatList, View } from "react-native";
import { Link, Stack } from "expo-router";

import { NavigationCardRow } from "~/components/CardRow";
import { HeaderPlusAction } from "~/components/HeaderAction";
import useWorkoutStore from "~/hooks/use-workout-store";

export default function ProgramSettingsScreen() {
  const { programs } = useWorkoutStore((state) => state);

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
      <FlatList
        contentContainerClassName="px-5 pt-36"
        data={programs}
        keyExtractor={(item) => item.programId}
        renderItem={({ index, item }) => (
          <Link
            href={`/(public)/(app)/program/form?programId=${item.programId}`}
            asChild
          >
            <NavigationCardRow
              title={item.name}
              stack={{ index, size: programs.length }}
              trailingText={`${item.sessions.length} session${item.sessions.length !== 1 ? "s" : ""}`}
              accessibilityLabel={`Navigate to Edit Workout Program ${item.name}`}
            />
          </Link>
        )}
      />
    </View>
  );
}
