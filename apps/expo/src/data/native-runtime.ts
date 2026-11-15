import { createApplicationDataRuntime } from "./application-runtime";
import { openMigratedApplicationData } from "./legacy/native-bootstrap";

/** Open the application's native data runtime. */
export function openNativeApplicationDataRuntime(
  onCacheError: (error: unknown) => void,
) {
  return createApplicationDataRuntime({
    open: openMigratedApplicationData,
    onCacheError,
  });
}
