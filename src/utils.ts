import { daysToWeeks, differenceInCalendarDays } from 'date-fns'
import { Activity, Load, Program, Session, Weight } from './types'

export const dateRegex = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/ // startswith: 2022-08-19T21:54:55

export const validWeights = [1.25, 2.5, 5, 10, 25, 35, 45, 55, 65]

export const normalizedLocalDate = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const weekAndDayFromStart = (start: Date, end: Date) => {
  const daysDiff = differenceInCalendarDays(normalizedLocalDate(end), normalizedLocalDate(start))
  const week = daysToWeeks(daysDiff) + 1
  const day = (daysDiff % 7) + 1
  return `${week > 1 ? `Week ${week}, ` : ''}Day ${day}`
}

export const stringifyLoad = ({ type, value }: Load) =>
  type === 'PERCENT' ? `${(value * 100).toFixed(2)}%` : `RPE ${value}`

export const stringifyWeight = (weight: Weight) => `${weight.value} ${weight.unit}`

export const round5 = (value: number) => Math.round(value / 5) * 5

export const sortRecordsByName = (rows: { name: string }[]) =>
  rows.sort((a, b) => a.name.localeCompare(b.name))

export const sumPlateWeights = (plateWeights: number[]) =>
  plateWeights.reduce((total, p) => total + p, 0)

export const recentActivityByExercise = (
  program: Program,
  exerciseId: string,
  session?: Session,
  activity?: Activity
): Activity | undefined => {
  for (let i = program.sessions.length - 1; i >= 0; i -= 1) {
    for (let j = program.sessions[i].activities.length - 1; j >= 0; j -= 1) {
      if (
        program.sessions[i].activities[j].exerciseId === exerciseId &&
        program.sessions[i].sessionId !== session?.sessionId &&
        (!activity ||
          (Math.abs(activity.mainSets.length - program.sessions[i].activities[j].mainSets.length) <
            2 &&
            Math.abs(activity.reps - program.sessions[i].activities[j].reps) < 3 &&
            Math.abs(activity.load.value - program.sessions[i].activities[j].load.value) < 1))
      ) {
        return program.sessions[i].activities[j]
      }
    }
  }

  return undefined
}
