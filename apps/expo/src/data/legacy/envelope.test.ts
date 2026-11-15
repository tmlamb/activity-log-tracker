import { describe, expect, it } from "vitest";

import { parseLegacyEnvelope } from "./envelope";

describe("legacy envelope", () => {
  it("distinguishes an absent source from an unversioned store", () => {
    expect(parseLegacyEnvelope(null)).toBeNull();
    expect(parseLegacyEnvelope('{"state":{"programs":[]}}')).toEqual({
      state: { programs: [] },
    });
  });

  it("rejects malformed and unsupported data instead of initializing defaults", () => {
    expect(() => parseLegacyEnvelope("{")).toThrow("invalid JSON");
    expect(() => parseLegacyEnvelope('{"state":[]}')).toThrow();
    expect(() => parseLegacyEnvelope('{"version":3,"state":{}}')).toThrow(
      "unsupported",
    );
  });
});
