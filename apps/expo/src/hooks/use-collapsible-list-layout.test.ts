import type { LegendListRef } from "@legendapp/list/react-native";
import type { LayoutChangeEvent } from "react-native";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { CollapsibleListActions } from "~/components/collapsible-list-context";
import { CollapsibleListSection } from "~/components/collapsible-list-section";
import { useCollapsibleListLayout } from "./use-collapsible-list-layout";

type FrameRequestCallback = Parameters<typeof requestAnimationFrame>[0];

// Drive the real hook with controlled React batches, RAFs and native metrics.
// No DOM/native renderer is needed to reproduce a lost scheduling wake-up.
const hooks = vi.hoisted(() => {
  interface Slot {
    value?: unknown;
    update?: (next: unknown) => void;
    callback?: unknown;
    dependencies?: readonly unknown[];
    cleanup?: () => void;
  }
  interface Driver {
    slots: Slot[];
    cursor: number;
    dirty: boolean;
    effects: (() => void)[];
  }
  let active: Driver | undefined;
  const sameDependencies = (a?: readonly unknown[], b?: readonly unknown[]) =>
    !!a &&
    !!b &&
    a.length === b.length &&
    a.every((value, i) => Object.is(value, b[i]));
  const nextSlot = () => {
    if (!active) throw new Error("Expected an active hook render");
    const index = active.cursor++;
    return { driver: active, slot: (active.slots[index] ??= {}) };
  };
  const effect = (
    run: () => void | (() => void),
    dependencies?: readonly unknown[],
  ) => {
    const { driver, slot } = nextSlot();
    if (!sameDependencies(slot.dependencies, dependencies)) {
      slot.dependencies = dependencies;
      driver.effects.push(() => {
        slot.cleanup?.();
        slot.cleanup = run() ?? undefined;
      });
    }
  };
  const react = {
    useState(initial: unknown): [unknown, (next: unknown) => void] {
      const { driver, slot } = nextSlot();
      if (!slot.update) {
        slot.value =
          typeof initial === "function"
            ? (initial as () => unknown)()
            : initial;
        slot.update = (next) => {
          const value =
            typeof next === "function"
              ? (next as (previous: unknown) => unknown)(slot.value)
              : next;
          if (!Object.is(value, slot.value)) {
            slot.value = value;
            driver.dirty = true;
          }
        };
      }
      return [slot.value, slot.update];
    },
    useCallback(callback: unknown, dependencies: readonly unknown[]) {
      const { slot } = nextSlot();
      if (!sameDependencies(slot.dependencies, dependencies)) {
        slot.callback = callback;
        slot.dependencies = dependencies;
      }
      return slot.callback;
    },
    useRef(initial: unknown): unknown {
      return react.useState(() => ({ current: initial }))[0];
    },
    useDeferredValue: (value: unknown) => value,
    useEffect: effect,
    useLayoutEffect: effect,
  };
  return {
    react,
    syncLayout: vi.fn(),
    createDriver() {
      const driver: Driver = { slots: [], cursor: 0, dirty: true, effects: [] };
      return {
        needsRender: () => driver.dirty,
        render<T>(hook: () => T) {
          active = driver;
          driver.cursor = 0;
          driver.effects = [];
          driver.dirty = false;
          const value = hook();
          active = undefined;
          for (const run of driver.effects) run();
          return value;
        },
        unmount: () => driver.slots.forEach((slot) => slot.cleanup?.()),
      };
    },
  };
});

vi.mock("react", () => hooks.react);
vi.mock("react/jsx-runtime", () => ({
  jsx: (type: unknown, props: unknown) => ({ type, props }),
  jsxs: (type: unknown, props: unknown) => ({ type, props }),
}));
vi.mock("react-native", () => ({ View: "View", PixelRatio: { get: () => 3 } }));
vi.mock("react-native-worklets", () => ({ scheduleOnRN: vi.fn() }));
vi.mock("@legendapp/list/react-native", () => ({
  useSyncLayout: () => hooks.syncLayout,
}));
vi.mock("~/components/collapsible-section-header", () => ({
  CollapsibleSectionHeader: "Header",
}));
vi.mock("react-native-reanimated", () => ({
  default: { View: "Animated.View" },
  ReduceMotion: { Never: "never" },
  useSharedValue: (value: boolean) =>
    hooks.react.useState(() => ({
      get: () => value,
      set: vi.fn(),
    }))[0],
  withTiming: (value: number) => value,
}));
vi.mock("~/components/collapsible-section-animation", () => ({
  collapsibleSectionLayoutTransition: {
    build: () => () => ({ initialValues: {}, animations: {} }),
  },
}));

let unmount: (() => void) | undefined;
afterEach(() => {
  unmount?.();
  unmount = undefined;
  vi.unstubAllGlobals();
});

function setup() {
  const driver = hooks.createDriver();
  unmount = driver.unmount;
  const frames = new Map<number, FrameRequestCallback>();
  let frameId = 0;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.set(++frameId, callback);
    return frameId;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  const keys = ["a", "b", "c"];
  const sizes = new Map(keys.map((key) => [key, 340]));
  let contentLength = 2_000;
  let footerSize = 0;
  let scroll = 0;
  const updateSize = vi.fn(
    (key: string, size: { height: number; width: number }) => {
      contentLength += size.height - (sizes.get(key) ?? 0);
      sizes.set(key, size.height);
    },
  );
  // Only these two native methods participate in the commit scheduler.
  const ref = {
    current: {
      getState: () => ({
        contentLength: contentLength + footerSize,
        scrollLength: 800,
        scroll,
        startBuffered: 0,
        endBuffered: 2,
        indexByKey: (key: string) => keys.indexOf(key),
        sizeAtIndex: (index: number) => sizes.get(keys[index] ?? ""),
      }),
      setItemSize: updateSize,
    } as unknown as LegendListRef,
  };
  let output: ReturnType<typeof useCollapsibleListLayout> | undefined;
  const useListLayout = () => useCollapsibleListLayout(ref, keys);
  const layout = () => {
    if (!output) throw new Error("Hook has not rendered");
    return output;
  };
  const flush = () => {
    for (let iteration = 0; driver.needsRender(); iteration++) {
      if (iteration > 20) throw new Error("Unexpected render loop");
      output = driver.render(useListLayout);
    }
  };
  flush();

  return {
    layout,
    updateSize,
    flush,
    scrollTo(offset: number) {
      scroll = offset;
    },
    queue(key: string, heightDelta: number) {
      const commit = vi.fn<(id: number) => void>();
      layout().prepareLayoutChange(key, { heightDelta, width: 350 }, commit);
      return commit;
    },
    measureFooter(height: number) {
      footerSize = height;
      layout().onMetricsChange({ footerSize, headerSize: 0 });
    },
    frame(flushRender = true) {
      const callbacks = [...frames.values()];
      frames.clear();
      callbacks.forEach((callback) => callback(0));
      if (flushRender) flush();
    },
  };
}

describe("collapsible list commit scheduling", () => {
  it("commits a header toggle despite a stream of no-op measurements from another row", () => {
    const test = setup();
    const commit = test.queue("a", -300);
    test.flush();
    for (const delta of [
      0.0001220703125, 0.333251953125, -0.3333740234375, 0,
    ]) {
      test.queue("b", delta);
      test.flush();
      test.frame();
    }
    expect(commit).toHaveBeenCalledOnce();
    expect(test.updateSize.mock.calls).toEqual([
      ["a", { height: 40, width: 350 }],
    ]);
  });

  it("retries a paused toggle when the footer's waiting/ready updates share a React batch", () => {
    const test = setup();
    const commit = test.queue("a", -300);
    test.flush();
    expect(test.layout().endReserve.ready).toBe(true);
    test.frame();

    test.scrollTo(1_200);
    test.frame(false);
    expect(commit).not.toHaveBeenCalled();
    test.measureFooter(300);
    test.flush();
    expect(test.layout().endReserve.ready).toBe(true);
    test.frame();
    test.frame();

    expect(commit).toHaveBeenCalledOnce();
    expect(test.updateSize).toHaveBeenCalledOnce();
  });

  it("does not postpone a new toggle when an older animation finishes during prewarming", () => {
    const test = setup();
    const previousCommit = test.queue("a", -300);
    test.flush();
    test.frame();
    test.frame();
    const previousId = previousCommit.mock.calls[0]?.[0];
    if (previousId == null)
      throw new Error("Expected the first transition to commit");

    const nextCommit = test.queue("b", -300);
    test.flush();
    test.frame();
    test.layout().finishLayoutChange(previousId);
    test.flush();
    test.frame();

    expect(nextCommit).toHaveBeenCalledOnce();
    expect(test.updateSize).toHaveBeenCalledTimes(2);
  });

  it("keeps the native measurement gate and supports canceling a toggle while it waits", () => {
    const test = setup();
    test.scrollTo(1_200);
    const close = test.queue("a", -300);
    test.flush();
    for (let frame = 0; frame < 5; frame++) test.frame();
    expect(close).not.toHaveBeenCalled();

    const cancel = test.queue("a", 0);
    test.flush();
    test.measureFooter(0);
    test.layout().finishEndReserve(test.layout().endReserve.id);
    test.flush();
    test.scrollTo(0);
    const other = test.queue("b", -300);
    test.flush();
    test.frame();
    test.frame();

    expect(close).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledWith(0);
    expect(other).toHaveBeenCalledOnce();
    expect(test.updateSize).toHaveBeenCalledOnce();
  });
});

interface SectionTree {
  props: {
    children: [
      { props: { onPress: () => void } },
      {
        props: {
          style: { height: number | undefined };
          children: { props: { onLayout: (event: LayoutChangeEvent) => void } };
        };
      },
    ];
  };
}

function setupSection(initiallyCollapsed = false, deferCommit = false) {
  const driver = hooks.createDriver();
  unmount = driver.unmount;
  let collapsed = initiallyCollapsed;
  let tree: SectionTree | undefined;
  let pendingCommit: ((id: number) => void) | undefined;
  const prepare = vi.fn<CollapsibleListActions["prepareLayoutChange"]>(
    (_key, _size, commit) => {
      if (deferCommit) pendingCommit = commit;
      else commit(0);
    },
  );
  const listLayout: CollapsibleListActions = {
    prepareLayoutChange: prepare,
    finishLayoutChange: vi.fn(),
    cancelItemLayout: vi.fn(),
  };
  const onCollapsedChange = (next: boolean) => {
    collapsed = next;
  };
  const useSection = () =>
    CollapsibleListSection({
      itemKey: "section",
      listLayout,
      title: "Section",
      collapsed,
      onCollapsedChange,
      children: "Content",
    }) as unknown as SectionTree;
  const flush = () => {
    for (let iteration = 0; driver.needsRender(); iteration++) {
      if (iteration > 20) throw new Error("Unexpected section render loop");
      tree = driver.render(useSection);
    }
  };
  const current = () => {
    if (!tree) throw new Error("Section has not rendered");
    return tree;
  };
  flush();
  return {
    prepare,
    bodyHeight: () => current().props.children[1].props.style.height,
    press() {
      current().props.children[0].props.onPress();
      flush();
    },
    measure(height: number) {
      current().props.children[1].props.children.props.onLayout({
        nativeEvent: { layout: { height, width: 350, x: 0, y: 0 } },
      } as LayoutChangeEvent);
      flush();
    },
    commit() {
      pendingCommit?.(1);
      pendingCommit = undefined;
      flush();
    },
  };
}

describe("collapsible section native measurement stability", () => {
  const height = 323.333251953125;
  // Captured from a repeating onLayout loop on the development iPhone.
  const samples = [323.3333740234375, 323.6666259765625, 323.333251953125];

  it("does not feed single-pixel height fluctuations back into layout", () => {
    const section = setupSection();
    section.measure(height);
    for (let frame = 0; frame < 60; frame++) {
      section.measure(samples[frame % samples.length] ?? height);
    }
    expect(section.prepare).not.toHaveBeenCalled();
    expect(section.bodyHeight()).toBe(height);
  });

  it("keeps a pending cold-open measurement stable until its endpoint commits", () => {
    const section = setupSection(true, true);
    section.press();
    section.measure(height);
    for (const sample of samples) section.measure(sample);
    expect(section.prepare).toHaveBeenCalledOnce();
    expect(section.bodyHeight()).toBe(0);
    section.commit();
    expect(section.bodyHeight()).toBe(height);
  });

  it("still accepts meaningful growth and accumulates changes from a stable baseline", () => {
    const section = setupSection();
    section.measure(height);
    section.measure(height + 0.2);
    expect(section.prepare).not.toHaveBeenCalled();
    section.measure(height + 0.6);
    expect(section.prepare).toHaveBeenCalledOnce();
    section.measure(height + 40);
    expect(section.prepare).toHaveBeenCalledTimes(2);
    expect(section.bodyHeight()).toBe(height + 40);
  });

  it("supersedes a queued resize when content returns to its committed height", () => {
    const section = setupSection(false, true);
    section.measure(height);
    section.measure(height + 40);
    section.measure(height);
    expect(section.prepare).toHaveBeenCalledTimes(2);
    expect(section.prepare.mock.calls[1]?.[1].heightDelta).toBe(0);
    section.commit();
    expect(section.bodyHeight()).toBe(height);
  });
});
