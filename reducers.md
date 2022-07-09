// export type Activity = {
// id: string
// warmupSets: number
// mainSets: number
// reps: number
// load: Load
// rest: number
// exercise: Exercise
// }

// export type Load = {
// value: number
// type: 'PERCENT' | 'RPE'
// }

// export type Workout = {
// priority: Priority
// id: string
// start: Date
// end: Date | undefined
// activities: Activity[]
// }

// export type Priority = {
// name: string
// }

// export type Program = {
// name: string
// icon: string
// id: string
// workouts: Workout[]
// }

// export interface ProgramAction {
// type: string
// payload: Program
// }

// export const programReducer = (programState: Program[], action: ProgramAction) => {
// switch (action.type) {
// case 'CREATE_PROGRAM':
// return [
// ...programState,
// {
// id: action.payload.id,
// name: action.payload.name,
// workouts: []
// }
// ]
// case 'DELETE_PROGRAM':
// return [...programState.filter(program => program.id !== action.payload.id)]
// case 'SET_PROGRAM':
// return programState.map(
// program => (program.id === action.payload.id ? action.payload : undefined) || program
// )
// default:
// return programState
// }
// }

// export type Exercise = {
// name: string
// id: string
// muscle: string
// oneRepMax: Weight
// }

// export type Weight = {
// value: number
// unit: 'lbs'
// }

// interface ExerciseAction {
// type: string
// payload: Exercise
// }

// export const exerciseReducer = (exerciseState: Exercise[], action: ExerciseAction) => {
// switch (action.type) {
// case 'CREATE_EXERCISE':
// return [
// ...exerciseState,
// {
// id: action.payload.id,
// name: action.payload.name,
// muscle: action.payload.muscle
// }
// ]
// case 'DELETE_EXERCISE':
// return [...exerciseState.filter(exercise => exercise.id !== action.payload.id)]
// case 'SET_PROGRAM':
// return exerciseState.map(
// exercise => (exercise.id === action.payload.id ? action.payload : undefined) || exercise
// )
// default:
// return exerciseState
// }
// }
