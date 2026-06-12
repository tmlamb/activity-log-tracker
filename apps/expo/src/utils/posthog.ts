import Constants from "expo-constants";
import PostHog from "posthog-react-native";

const { posthogApiKey, posthogHost } = Constants.expoConfig?.extra ?? {};
const apiKey = typeof posthogApiKey === "string" ? posthogApiKey.trim() : "";
const host =
  typeof posthogHost === "string" && posthogHost.trim()
    ? posthogHost.trim()
    : "https://us.i.posthog.com";

export const posthog = apiKey ? new PostHog(apiKey, { host }) : undefined;

export function captureException(error: unknown) {
  posthog?.captureException(error);
}
