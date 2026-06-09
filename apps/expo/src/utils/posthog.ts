import Constants from "expo-constants";
import PostHog from "posthog-react-native";

const { posthogApiKey, posthogHost } = Constants.expoConfig?.extra ?? {};

export const posthog = new PostHog(String(posthogApiKey ?? ""), {
  host: String(posthogHost ?? "https://us.i.posthog.com"),
});
