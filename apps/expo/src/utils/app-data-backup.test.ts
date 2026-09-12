import { describe, expect, it } from "vitest";

import type { ActivityLogBackupStores } from "./app-data-backup";
import {
  ACTIVITY_LOG_BACKUP_FORMAT,
  ACTIVITY_LOG_BACKUP_VERSION,
  InvalidActivityLogBackupError,
  parseActivityLogBackup,
  serializeActivityLogBackup,
} from "./app-data-backup";

const sessionStart = new Date("2026-09-12T14:00:00.000Z");
const sessionEnd = new Date("2026-09-12T15:00:00.000Z");
const stores: ActivityLogBackupStores = {
  "workout-storage": {
    programs: [
      {
        name: "Strength",
        programId: "program-1",
        sessions: [
          {
            name: "Day One",
            sessionId: "session-1",
            deload: false,
            start: sessionStart,
            end: sessionEnd,
            lastActivityAt: sessionEnd,
            status: "Done",
            activities: [
              {
                activityId: "activity-1",
                reps: 5,
                load: { value: 8, type: "RPE" },
                rest: 120,
                exerciseId: "exercise-1",
                warmupSets: [
                  {
                    workoutSetId: "warmup-1",
                    start: sessionStart,
                    end: sessionStart,
                    status: "Done",
                    type: "Warmup",
                    weight: { value: 45, unit: "lbs" },
                    actualReps: 5,
                    feedback: "Easy",
                  },
                ],
                mainSets: [
                  {
                    workoutSetId: "main-1",
                    start: sessionStart,
                    end: sessionEnd,
                    status: "Done",
                    type: "Main",
                    weight: { value: 135, unit: "lbs" },
                    actualReps: 5,
                    feedback: "Neutral",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    exercises: [
      {
        name: "Back Squat",
        exerciseId: "exercise-1",
        loadKind: "BARBELL",
        barbellId: "barbell-1",
        oneRepMax: { value: 225, unit: "lbs" },
        primaryMuscles: ["Quads"],
      },
    ],
    equipment: {
      barbells: [{ barbellId: "barbell-1", value: 45, unit: "lbs" }],
      plates: [
        {
          plateId: "plate-1",
          value: 45,
          unit: "lbs",
          quantity: 4,
        },
      ],
    },
    muscleGroups: ["Quads"],
  },
  "exercise-storage": {
    exercises: [
      {
        name: "Back Squat",
        loadKind: "BARBELL",
        primaryMuscles: ["Quads"],
      },
    ],
  },
};

describe("Activity Log backups", () => {
  it("round-trips both persistent stores and revives dates", () => {
    const createdAt = new Date("2026-09-12T16:00:00.000Z");
    const contents = serializeActivityLogBackup(stores, createdAt);
    const serialized = JSON.parse(contents) as {
      format: string;
      version: number;
      createdAt: string;
    };

    expect(serialized).toMatchObject({
      format: ACTIVITY_LOG_BACKUP_FORMAT,
      version: ACTIVITY_LOG_BACKUP_VERSION,
      createdAt: createdAt.toISOString(),
    });

    const parsed = parseActivityLogBackup(contents);
    const session = parsed["workout-storage"].programs[0]?.sessions[0];

    expect(parsed).toEqual(stores);
    expect(session?.start).toBeInstanceOf(Date);
    expect(session?.activities[0]?.mainSets[0]?.end).toBeInstanceOf(Date);
    expect(parsed["exercise-storage"].exercises).toEqual(
      stores["exercise-storage"].exercises,
    );
  });

  it("rejects malformed JSON", () => {
    expect(() => parseActivityLogBackup("{")).toThrow(
      InvalidActivityLogBackupError,
    );
  });

  it("rejects JSON that was not created as an Activity Log backup", () => {
    expect(() => parseActivityLogBackup(JSON.stringify(stores))).toThrow(
      InvalidActivityLogBackupError,
    );
  });

  it("rejects unsupported backup versions", () => {
    const backup = JSON.parse(serializeActivityLogBackup(stores)) as {
      version: number;
    };
    backup.version += 1;

    expect(() => parseActivityLogBackup(JSON.stringify(backup))).toThrow(
      InvalidActivityLogBackupError,
    );
  });

  it("rejects invalid nested workout data", () => {
    const backup = JSON.parse(serializeActivityLogBackup(stores)) as {
      stores: {
        "workout-storage": {
          programs: { sessions: { status: string }[] }[];
        };
      };
    };
    const session = backup.stores["workout-storage"].programs[0]?.sessions[0];
    if (session) session.status = "Finished";

    expect(() => parseActivityLogBackup(JSON.stringify(backup))).toThrow(
      InvalidActivityLogBackupError,
    );
  });
});
