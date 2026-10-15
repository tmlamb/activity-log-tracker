# Collapsible sections

Import the public components from `~/components/CollapsibleSection`.

## Virtualized pages

Use `CollapsibleSectionList` with one `CollapsibleSection` per data row:

```tsx
<CollapsibleSectionList
  data={sections}
  keyExtractor={(section) => section.id}
  contentContainerClassName="px-5 pt-36 pb-24"
  ListHeaderComponent={<ScreenHeading>Exercises</ScreenHeading>}
  ListFooterComponent={<HelperText>Add exercises using Edit.</HelperText>}
  renderItem={({ item }) => (
    <CollapsibleSection
      title={item.title}
      collapsed={item.collapsed}
      onCollapsedChange={(collapsed) => updateSection(item.id, collapsed)}
      titleClassName="leading-tight"
    >
      <ExerciseRows exercises={item.exercises} />
    </CollapsibleSection>
  )}
/>
```

The page owns its data, stable item IDs, and collapse state. The shared layer
provides:

- Hidden measurement on the first expansion, followed by one endpoint layout
  change and coordinated native reveal/position animations.
- Row retention while old and new viewport contents move.
- The same path for user toggles and externally requested changes, such as
  automatically collapsing a completed exercise.
- Safe immediate positioning during initial measurement and ordinary scrolling.
- Footer movement through the same list animation. Supply `ListFooterComponent`
  normally; the wrapper creates its animated row and collision-free key.
- Native end space when a collapse would clamp the scroll offset. The coordinator
  waits for the real footer's measured height before committing smaller sections,
  then shrinks it over the shared 320 ms curve. This footer is outside the virtual
  item layer: frames change native scrollable height without item-size updates,
  row-position recalculation, or React renders. Ordinary scrolling still updates
  the virtualized viewport, and footer measurements only update cached metrics.
- Shared timing, header appearance, accessibility state, and styling props.

The coordinator and row keys are supplied to each section through context. New
pages do not need a list ref, animation hook, or `listLayout`/`itemKey` props on
their sections. Non-collapsible rows are also supported.

## Sections in ordinary layout

Use `CollapsibleSection` directly inside a `ScrollView` or `View`. It uses normal
layout flow and shares the hidden-first-measurement behavior. Existing
`premeasureCollapsedContent`, style, and accessibility props work in both modes.

The section header and animation settings live in
`collapsible-section-header.tsx` and `collapsible-section-animation.ts`. The
virtualized coordinator is implemented by `use-collapsible-list-layout.ts` and
`collapsible-list-section.tsx`; these are implementation details of the public
components.
