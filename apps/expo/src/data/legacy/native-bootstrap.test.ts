import { beforeEach, describe, expect, it, vi } from "vitest";

import { openMigratedApplicationData } from "./native-bootstrap";

const mocks = vi.hoisted(() => ({
  bootstrap: vi.fn(),
  capture: vi.fn(),
}));

vi.mock("react-native-get-random-values", () => ({}));
vi.mock("expo-sqlite/kv-store", () => ({ default: {} }));
vi.mock("uuid", () => ({ v4: vi.fn() }));
vi.mock("../database/connections", () => ({
  openApplicationDatabase: vi.fn(),
}));
vi.mock("./bootstrap", () => ({ bootstrapLegacyConversion: mocks.bootstrap }));
vi.mock("~/utils/posthog", () => ({ posthog: { capture: mocks.capture } }));

describe("native migration reporting", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("reports the failure and its causes while preserving the original error", async () => {
    const cause = new Error("disk full");
    const error = new Error("Migration failed", { cause });
    mocks.bootstrap.mockRejectedValue(error);

    await expect(openMigratedApplicationData()).rejects.toBe(error);
    expect(mocks.capture).toHaveBeenCalledWith("sqlite_migration_failed", {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: { name: cause.name, message: cause.message, stack: cause.stack },
      },
    });
  });

  it("does not report successful starts and does not mask failures if reporting throws", async () => {
    const database = {};
    mocks.bootstrap.mockResolvedValueOnce(database);
    await expect(openMigratedApplicationData()).resolves.toBe(database);
    expect(mocks.capture).not.toHaveBeenCalled();

    const error = new Error("Migration failed");
    mocks.bootstrap.mockRejectedValueOnce(error);
    mocks.capture.mockImplementationOnce(() => {
      throw new Error("PostHog failed");
    });
    await expect(openMigratedApplicationData()).rejects.toBe(error);
  });

  it("includes error codes and errors nested in an aggregate", async () => {
    const inner = Object.assign(new Error("disk full"), {
      code: "SQLITE_FULL",
    });
    const error = new AggregateError([inner], "Database could not be opened");
    mocks.bootstrap.mockRejectedValue(error);
    await expect(openMigratedApplicationData()).rejects.toBe(error);
    expect(mocks.capture).toHaveBeenCalledWith("sqlite_migration_failed", {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        errors: [
          {
            name: inner.name,
            message: inner.message,
            stack: inner.stack,
            code: "SQLITE_FULL",
          },
        ],
      },
    });
  });
});
