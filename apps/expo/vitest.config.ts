import { fileURLToPath, URL } from "node:url";
import { transformAsync } from "@babel/core";
import { defineConfig } from "vitest/config";

const compiledDir = fileURLToPath(new URL("./src/data/", import.meta.url));

/**
 * Run the data layer through React Compiler, as Metro does for the whole app
 * (`experiments.reactCompiler`), so store tests exercise the memoization that
 * ships. Limited to `src/data`: some component and hook tests replace React
 * with a hand-written fake, which the compiler's runtime can't use.
 */
const reactCompiler = {
  name: "react-compiler",
  enforce: "pre" as const,
  async transform(code: string, id: string) {
    const file = id.split("?")[0] ?? id;
    if (!file.startsWith(compiledDir) || !/\.tsx?$/.test(file)) return null;
    const result = await transformAsync(code, {
      filename: file,
      babelrc: false,
      configFile: false,
      sourceMaps: true,
      parserOpts: { plugins: ["typescript", "jsx"] },
      plugins: [["babel-plugin-react-compiler", {}]],
    });
    return result?.code ? { code: result.code, map: result.map } : null;
  },
};

export default defineConfig({
  plugins: [reactCompiler],
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: { "~": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    server: {
      deps: { external: ["react-native", "react-native-reanimated"] },
    },
  },
});
