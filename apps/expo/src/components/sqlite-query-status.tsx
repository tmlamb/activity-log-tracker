import { View } from "react-native";

import { PrimaryCardAction } from "./CardRow";
import { HelperText } from "./Typography";

export function SQLiteQueryStatus({
  error,
  onRetry,
}: {
  error: boolean;
  onRetry: () => void;
}) {
  return (
    <View className="flex-1 gap-4 px-5 pt-5">
      <HelperText accessibilityRole={error ? "alert" : "summary"}>
        {error ? "Unable to load workout data." : "Loading workout data…"}
      </HelperText>
      {error && (
        <PrimaryCardAction
          label="Try Again"
          accessibilityLabel="Retry loading workout data"
          onPress={onRetry}
        />
      )}
    </View>
  );
}
