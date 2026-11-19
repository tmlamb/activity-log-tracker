import { defineConfig } from "eslint/config";

import { baseConfig } from "@activity-log/eslint-config/base";
import { reactConfig } from "@activity-log/eslint-config/react";

export default defineConfig(
  {
    ignores: [".expo/**", "expo-plugins/**"],
  },
  baseConfig,
  reactConfig,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "expo-router",
              importNames: ["Redirect"],
              message:
                "Use ~/components/MissingDataRedirect, which waits until its screen is visible.",
            },
            {
              name: "expo-router",
              importNames: ["useRouter"],
              message:
                "Use ~/hooks/use-router, which ignores a second tap's navigation.",
            },
          ],
        },
      ],
    },
  },
);
