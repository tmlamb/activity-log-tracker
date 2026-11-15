import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) &&
      !/\.test\.(ts|tsx)$/.test(entry.name)
      ? [path]
      : [];
  });
}

describe("SQLite runtime boundary", () => {
  it("never imports or initializes the obsolete persisted stores", () => {
    const root = process.cwd();
    const files = [join(root, "index.ts"), ...sourceFiles(join(root, "src"))];
    for (const path of files) {
      const content = readFileSync(path, "utf8");
      expect(content, path).not.toMatch(
        /use-workout-store|use-exercise-store|use-pending-selection|recover-pending-activity-log-restore|expo-sqlite\/localStorage\/install/,
      );
    }
  });
});
