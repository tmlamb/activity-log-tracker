import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { Exercise, Load } from '../../types'

export type ProgramNavParams = {
  programId: string
}

export type ProgramFormNavParams = {
  programId?: string
}

export type SessionNavParams = {
  sessionId: string
  programId: string
}

export type SessionFormNavParams = {
  sessionId?: string
  programId: string
}

export type ActivityNavParams = {
  activityId: string
  sessionId: string
  programId: string
}

export type ActivityFormNavParams = {
  activityId?: string
  sessionId: string
  programId: string
}

export type LoadFormNavParams = ModalSelectParams<Load> & {
  exerciseId?: string
}

export type ExerciseSelectNavParams = ModalSelectParams<Exercise>

export type ModalSelectParams<T> = {
  // [x: string]: any
  value?: T
  onChangeSelectKey: string
}

// export type ModalSelectEntity = Exercise | Load

export type ExerciseFormNavParams = {
  exerciseId?: string
  name?: string
}

export type WorkoutSetNavParams = {
  title: string
  workoutSetId: string
  activityId: string
  sessionId: string
  programId: string
}

export type RootStackParamList = {
  DashboardScreen: undefined
  SettingsScreen: undefined
  ExerciseSettingsScreen: undefined
  ProgramDetailScreen: ProgramNavParams
  ProgramFormModal: ProgramFormNavParams
  SessionDetailScreen: SessionNavParams
  SessionFormModal: SessionFormNavParams
  ActivityDetailScreen: ActivityNavParams
  ActivityFormModal: ActivityFormNavParams
  LoadFormModal: LoadFormNavParams
  ExerciseSelectModal: ExerciseSelectNavParams
  ExerciseFormModal: ExerciseFormNavParams
  WorkoutSetDetailScreen: WorkoutSetNavParams
}

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>

// export type NavigationScreen =
//   | 'DashboardScreen'
//   | 'SettingsScreen'
//   | 'ExerciseSettingsScreen'
//   | 'ProgramDetailScreen'
//   | 'ProgramFormModal'
//   | 'SessionDetailScreen'
//   | 'SessionFormModal'
//   | 'ActivityDetailScreen'
//   | 'ActivityFormModal'
//   | 'LoadFormModal'
//   | 'ExerciseSelectModal'
//   | 'ExerciseFormModal'
//   | 'WorkoutSetDetailScreen'

// export type NavigationScreenParams =
//   | ProgramNavParams
//   | SessionNavParams
//   | ActivityNavParams
//   | LoadFormNavParams
//   | ActivityFormNavParams
//   | ProgramFormNavParams
//   | SessionFormNavParams
//   | ExerciseSelectNavParams
//   | ExerciseFormNavParams
//   | WorkoutSetNavParams
//   | undefined

// export type ScreenNavigationProp =
//   | ProgramNavigationProp
//   | SessionNavigationProp
//   | ActivityNavigationProp
//   | ProgramFormNavigationProp
//   | SessionFormNavigationProp
//   | LoadFormNavigationProp
//   | ExerciseSelectNavigationProp
//   | ExerciseFormNavigationProp
//   | WorkoutSetNavigationProp

// export type StackScreenProps<Screen extends keyof StackParamList> = NativeStackScreenProps<
//   StackParamList,
//   Screen
// >

// type Test = StackScreenProps<'WorkoutDetailScreen'>
