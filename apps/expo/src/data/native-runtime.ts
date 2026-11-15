import { createApplicationDataRuntime } from "./application-runtime";
import { openMigratedApplicationData } from "./legacy/native-bootstrap";

/** Activate only after all routes use the SQLite data layer. */
export function openNativeApplicationDataRuntime(
  onCacheError: (error: unknown) => void,
) {
  return createApplicationDataRuntime({
    open: openMigratedApplicationData,
    onCacheError,
  });
}
