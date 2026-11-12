import { describe, expect, it } from "vitest";

import { allocateLegacyIdentities } from "./identity";

describe("legacy identity allocation", () => {
  it("keeps valid IDs and deterministically repairs duplicates and blanks", () => {
    const input = [
      { pointer: "/programs/0", original: "same" },
      { pointer: "/programs/1", original: "same" },
      { pointer: "/programs/2", original: " " },
      { pointer: "/programs/3", original: "1" },
    ];
    const result = allocateLegacyIdentities("program", input);
    expect(result).toEqual(allocateLegacyIdentities("program", input));
    expect(result.map(({ reason }) => reason)).toEqual([
      "unchanged",
      "duplicate",
      "invalid",
      "unchanged",
    ]);
    expect(result[0]?.id).toBe("same");
    expect(result[3]?.id).toBe("1");
    expect(new Set(result.map(({ id }) => id)).size).toBe(4);
  });

  it("does not allow a generated ID to displace a later valid ID", () => {
    const duplicate = [
      { pointer: "/0", original: "x" },
      { pointer: "/1", original: "x" },
    ];
    const generated = allocateLegacyIdentities("exercise", duplicate)[1]?.id;
    if (!generated) throw new Error("Expected generated ID");
    const result = allocateLegacyIdentities("exercise", [
      ...duplicate,
      { pointer: "/2", original: generated },
    ]);
    expect(result[1]?.id).not.toBe(generated);
    expect(result[2]?.id).toBe(generated);
  });

  it("does not treat an ID reused in another scope as a collision", () => {
    const first = [{ pointer: "/programs/0/sessions/0", original: "s" }];
    const second = [{ pointer: "/programs/1/sessions/0", original: "s" }];
    expect(allocateLegacyIdentities("session", first)[0]?.reason).toBe(
      "unchanged",
    );
    expect(allocateLegacyIdentities("session", second)[0]?.id).toBe("s");
  });
});
