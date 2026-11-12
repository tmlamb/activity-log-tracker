import { describe, expect, it } from "vitest";

import { parseLegacyEnvelope } from "./envelope";

describe("legacy envelope", () => {
  it("distinguishes an absent source from an unversioned store", () => {
    expect(parseLegacyEnvelope(null)).toBeNull();
    expect(parseLegacyEnvelope('{"state":{"programs":[]}}')).toEqual({
      state: { programs: [] },
      version: undefined,
    });
  });

  it("uses the old workout date reviver while retaining other fields", () => {
    const result = parseLegacyEnvelope(
      '{"version":2,"state":{"start":"2026-09-12T14:00:00.000Z","note":"2026-09-12T14:00:00.000Z","extra":3}}',
      true,
    );
    expect(result?.state).toEqual({
      start: new Date("2026-09-12T14:00:00.000Z"),
      note: "2026-09-12T14:00:00.000Z",
      extra: 3,
    });
  });

  it("rejects malformed and unsupported data instead of initializing defaults", () => {
    expect(() => parseLegacyEnvelope("{")).toThrow("invalid JSON");
    expect(() => parseLegacyEnvelope('{"state":[]}')).toThrow(
      "state is invalid",
    );
    expect(() => parseLegacyEnvelope('{"version":3,"state":{}}')).toThrow(
      "unsupported",
    );
  });
});
