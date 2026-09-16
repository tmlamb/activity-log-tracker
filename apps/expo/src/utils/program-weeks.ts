import _ from "lodash";

import type { Session } from "@activity-log/ui/utils";
import { weekAndDayNumbersFromStart } from "@activity-log/ui/utils";

const sessionStatusOrder: Record<Session["status"], number> = {
  Ready: 0,
  Planned: 1,
  Done: 2,
  Incomplete: 2,
};

export interface ProgramWeek {
  week: number;
  sessions: Session[];
}

interface ProgramWeeks {
  currentWeek: number;
  programStart: Date;
  weeks: ProgramWeek[];
}

export const buildProgramWeeks = (
  sessions: readonly Session[],
  now = new Date(),
): ProgramWeeks => {
  let earliestStart: Date | undefined;

  for (const session of sessions) {
    if (
      session.start &&
      (!earliestStart || session.start.getTime() < earliestStart.getTime())
    ) {
      earliestStart = session.start;
    }
  }

  const programStart = earliestStart ?? now;
  const plannedSessions: Session[] = [];
  const sessionsByWeek = new Map<number, Session[]>();

  for (const session of sessions) {
    if (session.status === "Planned") {
      plannedSessions.push(session);
      continue;
    }

    const { week } = weekAndDayNumbersFromStart(
      programStart,
      session.start ?? now,
    );
    const weekSessions = sessionsByWeek.get(week);

    if (weekSessions) {
      weekSessions.push(session);
    } else {
      sessionsByWeek.set(week, [session]);
    }
  }

  const weeks = [...sessionsByWeek].map(([week, weekSessions]) => ({
    week,
    sessions: _.sortBy(
      _.orderBy(weekSessions, ["start"], ["asc"]).reverse(),
      (session) => sessionStatusOrder[session.status],
    ),
  }));
  const { week: currentWeek } = weekAndDayNumbersFromStart(programStart, now);
  const currentWeekGroup = weeks.find((group) => group.week === currentWeek);
  plannedSessions.reverse();

  if (currentWeekGroup) {
    currentWeekGroup.sessions.unshift(...plannedSessions);
  } else {
    weeks.push({ week: currentWeek, sessions: plannedSessions });
  }

  weeks.sort((a, b) => b.week - a.week);

  return { currentWeek, programStart, weeks };
};
