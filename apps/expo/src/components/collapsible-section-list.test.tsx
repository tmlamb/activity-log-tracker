import type { PropsWithChildren, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CollapsibleListActions } from "./collapsible-list-context";
import type { CollapsibleSectionProps } from "./CollapsibleSection";
import {
  CollapsibleSection,
  CollapsibleSectionList,
} from "./CollapsibleSection";

interface NativeListProps {
  data: unknown[];
  keyExtractor: (item: unknown) => string;
  renderItem: (info: { item: unknown }) => ReactNode;
  ListHeaderComponent?: ReactNode;
  ListFooterComponent?: ReactNode;
  onMetricsChange: unknown;
  itemLayoutAnimation: unknown;
  alwaysRender: unknown;
  recycleItems: boolean;
  maintainVisibleContentPosition: unknown;
}

const { actions, useLayout, listRender, transition } = vi.hoisted(() => {
  const actions = {
    prepareLayoutChange: vi.fn(),
    finishLayoutChange: vi.fn(),
    cancelItemLayout: vi.fn(),
  };
  const transition = () => ({ initialValues: {}, animations: {} });
  return {
    actions,
    transition,
    useLayout: vi.fn((_ref: unknown, _keys: readonly string[]) => ({
      ...actions,
      alwaysRender: { keys: [] },
      endReserve: { id: 0, phase: "idle", height: 0, ready: true },
      finishEndReserve: vi.fn(),
      onMetricsChange: vi.fn(),
      itemLayoutAnimation: transition,
    })),
    listRender: vi.fn<(props: NativeListProps) => void>(),
  };
});

vi.mock("~/hooks/use-collapsible-list-layout", () => ({
  useCollapsibleListLayout: useLayout,
}));

vi.mock("./Styled", () => ({
  AnimatedLegendListStyled: (props: NativeListProps) => {
    listRender(props);
    return (
      <main>
        {props.ListHeaderComponent}
        {props.data.map((item) => (
          <div
            key={props.keyExtractor(item)}
            data-row={props.keyExtractor(item)}
          >
            {props.renderItem({ item })}
          </div>
        ))}
        <footer>{props.ListFooterComponent}</footer>
      </main>
    );
  },
}));

vi.mock("./collapsible-list-section", () => ({
  CollapsibleListSection: ({
    itemKey,
    listLayout,
    title,
    children,
  }: CollapsibleSectionProps & {
    itemKey: string;
    listLayout: CollapsibleListActions;
  }) => (
    <section
      data-coordinated={itemKey}
      data-connected={
        listLayout.prepareLayoutChange === actions.prepareLayoutChange
      }
    >
      {title}
      {children}
    </section>
  ),
}));

vi.mock("react-native", () => ({
  View: ({ children }: PropsWithChildren) => <div>{children}</div>,
  LayoutAnimation: {},
}));

vi.mock("react-native-reanimated", () => ({
  default: { View: ({ children }: PropsWithChildren) => <div>{children}</div> },
  useAnimatedStyle: (updater: () => unknown) => updater(),
  useSharedValue: (value: number) => ({ value }),
  withTiming: (value: number) => value,
}));

vi.mock("react-native-worklets", () => ({ scheduleOnRN: vi.fn() }));

vi.mock("./collapsible-section-animation", () => ({
  collapseAnimationDuration: 320,
  collapseAnimationEasing: (value: number) => value,
}));

vi.mock("./collapsible-section-header", () => ({
  CollapsibleSectionHeader: ({ title }: { title: string }) => <h2>{title}</h2>,
}));

beforeEach(() => vi.clearAllMocks());

describe("CollapsibleSectionList public API", () => {
  it("automatically connects ordinary sections to the list coordinator", () => {
    const markup = renderToStaticMarkup(
      <CollapsibleSectionList
        data={[{ id: "exercise-a", title: "Squat" }]}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <CollapsibleSection
            title={item.title}
            collapsed
            onCollapsedChange={vi.fn()}
          >
            <span>Sets for exercise {index + 1}</span>
          </CollapsibleSection>
        )}
      />,
    );

    expect(markup).toContain('data-coordinated="item:exercise-a"');
    expect(markup).toContain('data-connected="true"');
    expect(markup).toContain("Sets for exercise 1");
    expect(useLayout).toHaveBeenCalledWith(expect.anything(), [
      "item:exercise-a",
    ]);
    expect(listRender).toHaveBeenCalledWith(
      expect.objectContaining({
        itemLayoutAnimation: transition,
        recycleItems: false,
        maintainVisibleContentPosition: { data: false, size: true },
      }),
    );
    expect(listRender.mock.calls[0]?.[0].ListFooterComponent).toBeDefined();
    expect(typeof listRender.mock.calls[0]?.[0].onMetricsChange).toBe(
      "function",
    );
    expect(markup).toContain("<footer>");
    expect(markup).not.toContain('data-row="scroll-reserve"');
  });

  it("puts element and component footers in coordinated rows with distinct keys", () => {
    const Footer = () => <span>Footer help</span>;
    for (const footer of [<Footer key="element" />, Footer]) {
      const markup = renderToStaticMarkup(
        <CollapsibleSectionList
          data={[{ id: "footer" }]}
          keyExtractor={(item) => item.id}
          renderItem={() => <span>Actual item</span>}
          ListFooterComponent={footer}
        />,
      );

      expect(useLayout).toHaveBeenLastCalledWith(expect.anything(), [
        "item:footer",
        "footer",
      ]);
      expect(markup).toContain('data-row="item:footer"');
      expect(markup).toContain('data-row="footer"');
      expect(markup.indexOf("Actual item")).toBeLessThan(
        markup.indexOf("Footer help"),
      );
    }
  });

  it("keeps sections outside list rows on the standalone path", () => {
    const markup = renderToStaticMarkup(
      <>
        <CollapsibleSection
          title="Standalone"
          collapsed={false}
          onCollapsedChange={vi.fn()}
        >
          <span>Standalone content</span>
        </CollapsibleSection>
        <CollapsibleSectionList
          data={[] as string[]}
          keyExtractor={(item) => item}
          renderItem={() => null}
          ListFooterComponent={<span>Empty-list help</span>}
        />
      </>,
    );

    expect(markup).toContain("Standalone content");
    expect(markup).toContain("Empty-list help");
    expect(markup).not.toContain("data-coordinated");
    expect(useLayout).toHaveBeenCalledWith(expect.anything(), ["footer"]);
  });
});
