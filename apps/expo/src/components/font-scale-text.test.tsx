import type * as React from "react";
import { describe, expect, it, vi } from "vitest";

import { AnimatedText, FontScaleProvider, Text } from "./font-scale-text";

const environment = vi.hoisted(() => ({ fontScale: 1 }));

vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof React>()),
  use: () => environment.fontScale,
}));
vi.mock("react-native", () => ({
  Text: "native-text",
  useWindowDimensions: () => ({ fontScale: environment.fontScale }),
}));
vi.mock("react-native-reanimated", () => ({
  default: { Text: "animated-text" },
}));

describe("font scale text", () => {
  it("recreates native text only when the system scale changes", () => {
    environment.fontScale = 1;
    const first = Text({ children: "Session", maxFontSizeMultiplier: 2.5 });
    const unchanged = Text({ children: "Updated" });
    const animated = AnimatedText({ children: "Done" });
    environment.fontScale = 1.5;
    const resized = Text({ children: "Session", maxFontSizeMultiplier: 2.5 });
    const resizedAnimated = AnimatedText({ children: "Done" });

    expect(first.key).toBe(unchanged.key);
    expect(resized.key).not.toBe(first.key);
    expect(resizedAnimated.key).not.toBe(animated.key);
    expect(resized.props).toMatchObject({
      children: "Session",
      maxFontSizeMultiplier: 2.5,
    });
  });

  it("provides the current window font scale to text descendants", () => {
    environment.fontScale = 2;
    const provider = FontScaleProvider({ children: "content" });
    expect(provider.props).toMatchObject({ value: 2, children: "content" });
  });
});
