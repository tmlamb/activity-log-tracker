import type { ConfigContext, ExpoConfig } from "expo/config";

const { APP_ENV } = process.env;

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    name: `Activity Log${APP_ENV !== "production" ? ` (${APP_ENV ?? "dev"})` : ""}`,
    slug: "activity-log-tracker",
    scheme: "activitylog",
    version: "2.0.0",
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
    runtimeVersion: {
      policy: "appVersion",
    },
    assetBundlePatterns: ["**/*"],
    ios: {
      bundleIdentifier: `com.activitylog.app${APP_ENV !== "production" ? `.${APP_ENV ?? "dev"}` : ""}`,
      supportsTablet: true,
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      icon: "./assets/icon.png",
    },
    android: {
      package: `com.activitylog.app${APP_ENV !== "production" ? `.${APP_ENV ?? "dev"}` : ""}`,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0ea5e9",
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
      appEnv: APP_ENV,
    },
    plugins: [
      "expo-router",
      "expo-localization",
      [
        "expo-splash-screen",
        {
          backgroundColor: "#0ea5e9",
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
    ],
  };
};
