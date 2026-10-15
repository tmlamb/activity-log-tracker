import { createContext } from "react";

import type { CollapsibleListLayout } from "~/hooks/use-collapsible-list-layout";

export type CollapsibleListActions = Pick<
  CollapsibleListLayout,
  "prepareLayoutChange" | "finishLayoutChange" | "cancelItemLayout"
>;

export const CollapsibleListItemContext = createContext<{
  itemKey: string;
  layout: CollapsibleListActions;
} | null>(null);
