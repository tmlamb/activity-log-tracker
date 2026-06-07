export interface Weight {
    value: number;
    unit: "lbs" | "kg";
}
export interface Load {
    value: number;
    type: "PERCENT" | "RPE";
}
export type PlatePair = Weight & {
    platePairId: string;
};
export interface WorkoutSet {
    workoutSetId: string;
    start?: Date;
    end?: Date;
    status: "Planned" | "Ready" | "Done";
    type: "Warmup" | "Main";
    actualWeight?: Weight;
    actualReps?: number;
    feedback: "Easy" | "Neutral" | "Hard";
}
export type WarmupSet = WorkoutSet & {
    type: "Warmup";
};
export type MainSet = WorkoutSet & {
    type: "Main";
};
export interface Activity {
    activityId: string;
    reps: number;
    load: Load;
    rest: number;
    exerciseId: string;
    warmupSets: WarmupSet[];
    mainSets: MainSet[];
}
export interface Exercise {
    name: string;
    exerciseId: string;
    oneRepMax?: Weight;
    primaryMuscle?: string;
}
export interface Session {
    name: string;
    sessionId: string;
    start?: Date;
    end?: Date;
    status: "Planned" | "Ready" | "Done";
    activities: Activity[];
}
export interface Program {
    name: string;
    programId: string;
    sessions: Session[];
}
export interface Equipment {
    barbellWeight: Weight;
    platePairs: PlatePair[];
}
export declare const dateRegex: RegExp;
export declare const validWeights: number[];
export declare const normalizedLocalDate: (date: Date) => Date;
export declare const weekAndDayFromStart: (start: Date, end: Date) => string;
export declare const stringifyLoad: ({ type, value }: Load) => string;
export declare const stringifyWeight: (weight: Weight) => string;
export declare const round5: (value: number) => number;
export declare const sortRecordsByName: (rows: {
    name: string;
}[]) => {
    name: string;
}[];
export declare const normalizeExerciseName: (name: string) => string;
export declare const exerciseNamesMatch: (a: string, b: string) => boolean;
export declare const sumPlateWeights: (plateWeights: number[]) => number;
export declare const recentActivityByExercise: (program?: Program, exerciseId?: string, session?: Session, activity?: Activity) => Activity | undefined;
//# sourceMappingURL=utils.d.ts.map