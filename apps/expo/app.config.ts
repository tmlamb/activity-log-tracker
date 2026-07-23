import type { ConfigContext, ExpoConfig } from "expo/config";
import * as dotenv from "dotenv";

import packageJson from "./package.json";

dotenv.config({ path: "../../.env" });

const {
  APP_ENV,
  IOS_BUNDLE_ID,
  ANDROID_PACKAGE_NAME,
  EXPO_OWNER,
  POSTHOG_API_KEY,
  POSTHOG_HOST,
} = process.env;
const appVersion = packageJson.version;
const runtimeVersion = appVersion.split(".").slice(0, 2).join(".");
const appIdSuffix = APP_ENV !== "production" ? `.${APP_ENV}` : "";
const appIconBackgroundColor = "#0ea5e9";

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: `Activity Log${
      APP_ENV !== "production" ? ` (${APP_ENV ?? "dev"})` : ""
    }`,
    slug: "activity-log-tracker",
    scheme: "activitylog",
    owner: EXPO_OWNER,
    version: appVersion,
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    experiments: {
      tsconfigPaths: true,
      typedRoutes: true,
      reactCompiler: true,
    },
    updates: {
      fallbackToCacheTimeout: 10000,
      url: "https://u.expo.dev/bf8483a0-b4f2-4316-812f-1ab9b8f0e00b",
    },
    runtimeVersion,
    assetBundlePatterns: ["**/*"],
    ios: {
      bundleIdentifier: `${IOS_BUNDLE_ID}${appIdSuffix}`,
      supportsTablet: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      icon: "./assets/icon.png",
    },
    android: {
      package: `${ANDROID_PACKAGE_NAME}${appIdSuffix}`,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: appIconBackgroundColor,
      },
      softwareKeyboardLayoutMode: "pan",
    },
    androidStatusBar: {
      translucent: false,
    },
    extra: {
      eas: {
        projectId: "bf8483a0-b4f2-4316-812f-1ab9b8f0e00b",
      },
      posthogApiKey: POSTHOG_API_KEY,
      posthogHost: POSTHOG_HOST,
      appEnv: APP_ENV,
    },
    plugins: [
      "expo-router",
      "expo-localization",
      [
        "expo-splash-screen",
        {
          backgroundColor: appIconBackgroundColor,
          image: "./assets/adaptive-icon.png",
          imageWidth: 200,
        },
      ],
      "expo-navigation-bar",
      [
        "expo-asset",
        {
          assets: ["./assets/adaptive-icon.png"],
        },
      ],
      "expo-status-bar",
      "expo-sqlite",
    ],
  };
};
