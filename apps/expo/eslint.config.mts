import { defineConfig } from "eslint/config";

import { baseConfig } from "@activity-log/eslint-config/base";
import { reactConfig } from "@activity-log/eslint-config/react";

export default defineConfig(
  {
    ignores: [".expo/**", "expo-plugins/**"],
  },
  baseConfig,
  reactConfig,
);
