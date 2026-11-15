import { readFileSync } from "node:fs";
import { URL } from "node:url";
import { describe, expect, it } from "vitest";

import { serializePortableBackupV2 } from "./portable-v2";
import { prepareApplicationRestore } from "./prepare-restore";

describe("portable restore format selection", () => {
  it("accepts both official v1 backups and canonical v2 backups", () => {
    const v1 = readFileSync(
      new URL("../legacy/fixtures/backup-v1.json", import.meta.url),
      "utf8",
    );
    expect(prepareApplicationRestore(v1).version).toBe(1);
    const v2 = serializePortableBackupV2(
      {
        programs: [],
        exercises: [],
        presets: [],
        equipment: { barbells: [], plates: [] },
        muscleGroups: [],
      },
      123,
    );
    expect(prepareApplicationRestore(v2).version).toBe(2);
  });

  it("rejects invalid or future formats before a write is started", () => {
    for (const input of [
      "invalid",
      "null",
      "[]",
      '{"version":3}',
      '{"version":2,"format":"unexpected"}',
    ])
      expect(() => prepareApplicationRestore(input)).toThrow();
  });
});
