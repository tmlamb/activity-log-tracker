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
  value?: T
  parentScreen: keyof RootStackParamList
  parentParams: object
  modalSelectId: string
}

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

export type ModalSelectResponseParams<T> = {
  modalSelectId: string
  modalSelectValue?: T
}

export type RootStackParamList = {
  DashboardScreen: undefined
  SettingsScreen: undefined
  ExerciseSettingsScreen: undefined
  ProgramSettingsScreen: undefined
  ProgramDetailScreen: ProgramNavParams
  ProgramFormModal: ProgramFormNavParams
  SessionDetailScreen: SessionNavParams
  SessionFormModal: SessionFormNavParams | ModalSelectResponseParams<Exercise | Load>
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
