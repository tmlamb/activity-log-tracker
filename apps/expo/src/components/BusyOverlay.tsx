import { ActivityIndicator, View } from "react-native";

import { Text } from "./font-scale-text";

/**
 * A progress overlay covering the screen it is rendered in. The spinner is
 * native, so it keeps animating while the JS thread is busy with synchronous
 * work. (Not a `Modal`: on iOS an `Alert` can fail to appear while a modal is
 * still dismissing.)
 */
export default function BusyOverlay({ message }: { message: string | null }) {
  if (message === null) return null;
  return (
    <View
      className="absolute inset-0 items-center justify-center bg-black/50"
      accessibilityViewIsModal
    >
      <View
        className="bg-background items-center gap-4 rounded-3xl px-8 py-6"
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={message}
      >
        <ActivityIndicator size="large" />
        <Text className="text-foreground text-center text-lg">{message}</Text>
      </View>
    </View>
  );
}

/**
 * Resolve once pending UI has been drawn, so an overlay is on screen before
 * synchronous work blocks the JS thread.
 */
export function afterNextPaint() {
  return new Promise<void>((resolve) =>
    requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
  );
}
