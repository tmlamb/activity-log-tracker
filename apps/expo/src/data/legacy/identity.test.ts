import { describe, expect, it } from "vitest";

import { withIds } from "./identity";

describe("legacy identity allocation", () => {
  it("keeps the first use of each ID and replaces repeats and blanks", () => {
    const ids = withIds("program", ["same", "same", null, "1"], (id) => id).map(
      ({ id }) => id,
    );
    expect(ids[0]).toBe("same");
    expect(ids[3]).toBe("1");
    expect(new Set(ids).size).toBe(4);
  });
});
