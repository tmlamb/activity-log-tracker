import { beforeEach, describe, expect, it } from "vitest";

import { useSelectionHandoff } from "./selection-handoff";

describe("scoped selection handoff", () => {
  beforeEach(() => useSelectionHandoff.setState({ entries: {} }));

  it("accepts only the matching generation, owner, request, activity and result kind", () => {
    const ticket = {
      generation: 2,
      ownerId: "form",
      requestId: "request",
      activityId: "activity",
    };
    useSelectionHandoff.getState().begin(ticket, "exercise");
    const result = { kind: "exercise" as const, exerciseId: "e" };
    for (const changed of [
      { generation: 3 },
      { ownerId: "other" },
      { requestId: "other" },
      { activityId: "other" },
    ])
      expect(
        useSelectionHandoff
          .getState()
          .complete({ ...ticket, ...changed }, result),
      ).toBe(false);
    expect(
      useSelectionHandoff
        .getState()
        .complete(ticket, { kind: "load", load: { type: "RPE", value: 8 } }),
    ).toBe(false);
    expect(useSelectionHandoff.getState().complete(ticket, result)).toBe(true);
    expect(useSelectionHandoff.getState().complete(ticket, result)).toBe(false);
    expect(
      useSelectionHandoff
        .getState()
        .consume({ ...ticket, ownerId: "other" }, "exercise"),
    ).toBeNull();
    expect(useSelectionHandoff.getState().consume(ticket, "exercise")).toEqual(
      result,
    );
    expect(
      useSelectionHandoff.getState().consume(ticket, "exercise"),
    ).toBeNull();
  });

  it("clears only the intended owner or previous dataset generation", () => {
    const first = { generation: 1, ownerId: "a", requestId: "first" };
    const second = { generation: 1, ownerId: "b", requestId: "second" };
    const third = { generation: 2, ownerId: "a", requestId: "third" };
    for (const ticket of [first, second, third])
      useSelectionHandoff.getState().begin(ticket, "template");
    useSelectionHandoff.getState().clearOwner(1, "a");
    expect(Object.keys(useSelectionHandoff.getState().entries).sort()).toEqual([
      "second",
      "third",
    ]);
    useSelectionHandoff.getState().clearOtherGenerations(2);
    expect(Object.keys(useSelectionHandoff.getState().entries)).toEqual([
      "third",
    ]);
    expect(() =>
      useSelectionHandoff.getState().begin(third, "template"),
    ).toThrow("already exists");
    expect(() =>
      useSelectionHandoff
        .getState()
        .begin({ ...first, requestId: "new" }, "exercise"),
    ).toThrow("Invalid selection");
  });
});
