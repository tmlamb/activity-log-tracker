import type { Href } from "expo-router";
// The one place allowed to render Redirect; see eslint.config.mts.
// eslint-disable-next-line no-restricted-imports
import { Redirect } from "expo-router";
import { useIsFocused } from "expo-router/react-navigation";

/**
 * Leave a screen whose data is gone. Screens keep reading while covered, so
 * wait until this one is visible: a screen above (for example a form that just
 * deleted this record) is doing its own navigation.
 */
export default function MissingDataRedirect({
  href = "/(public)/(app)",
}: {
  href?: Href;
}) {
  return useIsFocused() ? <Redirect href={href} /> : null;
}
