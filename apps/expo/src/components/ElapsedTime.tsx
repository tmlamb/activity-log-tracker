import { useEffect, useState } from "react";
import { differenceInSeconds } from "date-fns";

import { DetailCardRow } from "./CardRow";

export default function E1lapsedTime({
  start,
  end,
  status,
  showHours,
  stack,
}: {
  start: Date;
  end?: Date;
  status: string;
  showHours?: boolean;
  stack?: {
    index: number;
    size: number;
  };
}) {
  const [elapsedTimeSeconds, setElapsedTimeSeconds] = useState(() =>
    end ? differenceInSeconds(end.getTime(), start.getTime()) : 0,
  );

  useEffect(() => {
    const updateElapsedTime = () => {
      setElapsedTimeSeconds(
        differenceInSeconds(end ? end.getTime() : Date.now(), start.getTime()),
      );
    };

    updateElapsedTime();

    if (status === "Ready") {
      const id = setInterval(updateElapsedTime, 1000);
      return () => {
        clearInterval(id);
      };
    }
    return undefined;
  }, [start, end, status]);

  const formattedTime = showHours
    ? `${String(Math.floor(elapsedTimeSeconds / 3600)).padStart(2, "0")}:${String(Math.floor(elapsedTimeSeconds / 60) % 60).padStart(2, "0")}:${String(elapsedTimeSeconds % 60).padStart(2, "0")}`
    : `${String(Math.floor(elapsedTimeSeconds / 60)).padStart(2, "0")}:${String(elapsedTimeSeconds % 60).padStart(2, "0")}`;

  return (
    <DetailCardRow label="Elapsed Time" value={formattedTime} stack={stack} />
  );
}
