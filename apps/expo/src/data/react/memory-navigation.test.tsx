import { DatabaseSync } from "node:sqlite";
import { QueryClientProvider } from "@tanstack/react-query";
import { act, create } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import type { openApplicationDatabase } from "../database/connections";
import type { ApplicationDataRuntime } from "./application-data";
import {
  applyMemoryChange,
  buildApplicationMemory,
  readApplicationMemoryFacts,
} from "../application-memory";
import { createApplicationDataRuntime } from "../application-runtime";
import { workoutKeys } from "../cache/keys";
import { createWorkoutQueryClient } from "../cache/query-client";
import { SCHEMA_V1, SCHEMA_V2 } from "../database/schema";
import { createTransactionQueue } from "../database/transactions";
import { useExerciseSeries, useProgramInsights } from "./insight-queries";
import {
  useProgramHeader,
  useProgramOverview,
  useProgramSummaries,
  useProgramWeek,
} from "./program-queries";
import {
  useSessionDeloadCandidate,
  useSessionEditorSeed,
  useSetContext,
} from "./session-queries";
import {
  useEquipment,
  useExerciseDetail,
  useExerciseLibrary,
} from "./settings-queries";

vi.mock("expo-router/react-navigation", () => ({ useIsFocused: () => true }));

describe("memory-backed navigation", () => {
  it("keeps session and set navigation off the reader after real committed changes", async () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    const db = new DatabaseSync(":memory:");
    db.exec(`${SCHEMA_V1} ${SCHEMA_V2}
      INSERT INTO bootstrap_state VALUES (1,'db','ready',1);
      INSERT INTO programs VALUES ('p','Program',0);
      INSERT INTO sessions(program_id,id,name,position,status,deload) VALUES ('p','s','Session',0,'Planned',0);
      INSERT INTO activities(program_id,session_id,id,position,reps,load_type,load_value) VALUES ('p','s','a',0,8,'RPE',8);
      INSERT INTO workout_sets(program_id,session_id,activity_id,id,kind,position,status,feedback) VALUES ('p','s','a','set','Main',0,'Planned','Neutral');`);
    const connection = {
      execAsync: (sql: string) => {
        db.exec(sql);
        return Promise.resolve();
      },
      getFirstAsync: <T,>(sql: string, ...params: (string | number | null)[]) =>
        Promise.resolve(
          (db.prepare(sql).get(...params) as T | undefined) ?? null,
        ),
      getAllAsync: <T,>(sql: string, ...params: (string | number | null)[]) =>
        Promise.resolve(db.prepare(sql).all(...params) as T[]),
      runAsync: (sql: string, ...params: (string | number | null)[]) =>
        Promise.resolve({
          changes: Number(db.prepare(sql).run(...params).changes),
        }),
    };
    const queue = createTransactionQueue(connection, "BEGIN IMMEDIATE");
    const read = vi.fn(queue);
    const database = {
      read,
      write: queue,
      close: async () => {
        await queue.close();
        db.close();
      },
    } as unknown as Awaited<ReturnType<typeof openApplicationDatabase>>;
    const runtime = await createApplicationDataRuntime({
      open: () => Promise.resolve(database),
      onCacheError: (error) => {
        throw error;
      },
      now: () => 1000,
    });
    const reference = {
      programId: "p",
      sessionId: "s",
      activityId: "a",
      setId: "set",
    };
    function Screens() {
      const session = useSessionEditorSeed(runtime, "p", "s");
      const set = useSetContext(runtime, reference);
      return (
        <span>{`${session.data?.session?.status}:${set.data?.set.status}`}</span>
      );
    }
    let renderer: ReturnType<typeof create> | undefined;
    try {
      read.mockClear();
      await act(async () => {
        renderer = create(
          <QueryClientProvider client={runtime.cache}>
            <Screens />
          </QueryClientProvider>,
        );
        await Promise.resolve();
      });
      await act(async () => {
        await runtime.getSnapshot().service.startSet(reference, {
          actualReps: 4,
          weight: null,
          feedback: "Neutral",
        });
        await Promise.resolve();
      });
      expect(read).not.toHaveBeenCalled();
      expect(JSON.stringify(renderer?.toJSON())).toContain("Ready:Ready");
      await act(async () => {
        await runtime
          .getSnapshot()
          .service.patchSet(reference, { actualReps: 6 });
        await runtime.getSnapshot().service.completeSet(reference, {
          actualReps: 6,
          weight: null,
          feedback: "Neutral",
        });
        await Promise.resolve();
        renderer?.unmount();
        await Promise.resolve();
      });
      runtime.cache.clear();
      await act(async () => {
        renderer = create(
          <QueryClientProvider client={runtime.cache}>
            <Screens />
          </QueryClientProvider>,
        );
        await Promise.resolve();
      });
      expect(JSON.stringify(renderer?.toJSON())).toContain("Ready:Done");
      expect(read).not.toHaveBeenCalled();
      await act(async () => {
        renderer?.unmount();
        await Promise.resolve();
      });
    } finally {
      await runtime.close();
    }
  });

  it("renders and refreshes workout screens without calling SQLite services", async () => {
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
    const db = new DatabaseSync(":memory:");
    const cache = createWorkoutQueryClient();
    try {
      db.exec(`${SCHEMA_V1} ${SCHEMA_V2}
        INSERT INTO programs VALUES ('p','Program',0);
        INSERT INTO sessions(program_id,id,name,position,status,deload) VALUES ('p','s','Session',0,'Planned',0);
        INSERT INTO exercises(id,name,normalized_name,position,load_kind,deleted) VALUES ('e','Exercise','exercise',0,'SINGLE_WEIGHT',0);
        INSERT INTO activities(program_id,session_id,id,exercise_id,position,reps,load_type,load_value) VALUES ('p','s','a','e',0,8,'RPE',8);
        INSERT INTO workout_sets(program_id,session_id,activity_id,id,kind,position,status,feedback) VALUES ('p','s','a','set','Main',0,'Planned','Neutral');`);
      const memory = buildApplicationMemory(
        await readApplicationMemoryFacts({
          getAllAsync: <T,>(sql: string) =>
            Promise.resolve(db.prepare(sql).all() as T[]),
        }),
        1,
      );
      const service = {
        listPrograms: vi.fn(),
        programHeader: vi.fn(),
        programOverview: vi.fn(),
        programWeek: vi.fn(),
        sessionEditorSeed: vi.fn(),
        setContext: vi.fn(),
        equipment: vi.fn(),
        exercise: vi.fn(),
        exerciseLibrary: vi.fn(),
        programInsights: vi.fn(),
        exerciseSeries: vi.fn(),
        sessionDeloadCandidate: vi.fn(),
      };
      const snapshot = { generation: 1, memory, service };
      const runtime = {
        cache,
        getSnapshot: () => snapshot,
        subscribe: () => () => undefined,
      } as unknown as ApplicationDataRuntime;
      const reference = {
        programId: "p",
        sessionId: "s",
        activityId: "a",
        setId: "set",
      };
      function Screens() {
        const programs = useProgramSummaries(runtime);
        const header = useProgramHeader(runtime, "p");
        const overview = useProgramOverview(runtime, "p");
        const week = useProgramWeek(
          runtime,
          "p",
          1,
          overview.data?.programStartMs ?? 0,
          overview.data?.currentWeek ?? 1,
          true,
        );
        const session = useSessionEditorSeed(runtime, "p", "s");
        const set = useSetContext(runtime, reference);
        const equipment = useEquipment(runtime);
        const exercise = useExerciseDetail(runtime, "e");
        const library = useExerciseLibrary(runtime);
        const insights = useProgramInsights(runtime, "p");
        const series = useExerciseSeries(runtime, reference);
        const deload = useSessionDeloadCandidate(runtime, "p", "s", true);
        return (
          <span>
            {JSON.stringify({
              programs: programs.data,
              header: header.data,
              week: week.data,
              session: session.data,
              set: set.data,
              equipment: equipment.data,
              exercise: exercise.data,
              library: library.data,
              insights: insights.data,
              series: series.data,
              deload: deload.data,
            })}
          </span>
        );
      }
      let renderer: ReturnType<typeof create> | undefined;
      await act(async () => {
        renderer = create(
          <QueryClientProvider client={cache}>
            <Screens />
          </QueryClientProvider>,
        );
        await Promise.resolve();
      });
      expect(JSON.stringify(renderer?.toJSON())).toContain("Session");
      expect(
        applyMemoryChange(memory, {
          type: "patch",
          reference,
          patch: { actualReps: 6 },
          nowMs: 100,
        }),
      ).toBe(true);
      await act(async () => {
        await cache.invalidateQueries({ queryKey: workoutKeys.root(1) });
      });
      for (const call of Object.values(service))
        expect(call).not.toHaveBeenCalled();
      expect(
        cache.getQueryData(workoutKeys.sessionEditorSeed(1, "p", "s")),
      ).toMatchObject({
        session: { activities: [{ mainSets: [{ actualReps: 6 }] }] },
      });
      await act(async () => {
        renderer?.unmount();
        await Promise.resolve();
      });
    } finally {
      cache.clear();
      db.close();
    }
  });
});
