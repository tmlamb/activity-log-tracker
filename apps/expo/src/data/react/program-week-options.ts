import { infiniteQueryOptions } from "@tanstack/react-query";

import type { ApplicationDataSnapshot } from "../application-runtime";
import type { TimelineCursor } from "../domain/program-timeline";
import { workoutKeys } from "../cache/keys";

export function programWeekQueryOptions(
  snapshot: ApplicationDataSnapshot,
  programId: string,
  week: number,
  programStartMs: number,
  currentWeek: number,
) {
  return infiniteQueryOptions({
    queryKey: workoutKeys.programWeek(
      snapshot.generation,
      programId,
      week,
      programStartMs,
      currentWeek,
    ),
    initialPageParam: undefined as TimelineCursor | undefined,
    queryFn: async ({ pageParam }) => {
      const page = await snapshot.service.programWeek(programId, {
        week,
        after: pageParam,
        limit: 50,
      });
      if (!page) throw new Error("The program is no longer available.");
      return page;
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    maxPages: 3,
    retryOnMount: false,
  });
}
