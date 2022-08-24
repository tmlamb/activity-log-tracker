import { daysToWeeks, differenceInCalendarDays } from 'date-fns'
import { Activity, Load, Program, Session, Weight } from './types'

export const dateRegex = /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/ // startswith: 2022-08-19T21:54:55

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

export const sumPlateWeights = (plates: Weight[]) => plates.reduce((total, p) => total + p.value, 0)

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

export const plateWeights = [
  { weight: '2.5', svgProps: { height: 30, width: 6, fill: '#38bdf8', rx: 1.5 } },
  { weight: '5', svgProps: { height: 40, width: 7, fill: '#f60', rx: 2 } },
  { weight: '10', svgProps: { height: 50, width: 8, fill: '#fbbc04', rx: 2 } },
  { weight: '15', svgProps: { height: 65, width: 9, fill: '#f87171', rx: 2 } },
  { weight: '25', svgProps: { height: 80, width: 10, fill: '#38bdf8', rx: 2.5 } },
  { weight: '35', svgProps: { height: 95, width: 10, fill: '#f60', rx: 2.5 } },
  { weight: '45', svgProps: { height: 145, width: 12, fill: '#fbbc04', rx: 3 } },
  { weight: '55', svgProps: { height: 160, width: 13, fill: '#f87171', rx: 3 } },
  { weight: '65', svgProps: { height: 175, width: 13, fill: '#38bdf8', rx: 3 } }
]
