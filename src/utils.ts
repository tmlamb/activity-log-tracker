import { daysToWeeks, differenceInCalendarDays } from 'date-fns'
import { Activity, Load, Program, Session, Weight } from './types'

// One day in milliseconds
export const oneDayMilliseconds = 1000 * 60 * 60 * 24

export const mapSessionsByDate = (
  sessions: Session[],
  program: Program,
  dateFormatCallback: (date: Date, program: Program) => string
) => {
  const map = new Map<string, Session[]>()
  sessions.forEach(session => {
    const dateKey = dateFormatCallback(session.start || new Date(), program)
    if (!map.has(dateKey)) {
      map.set(dateKey, [])
    }
    map.get(dateKey)?.push(session)
  })
  return map
}

export const normalizedLocalDate = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))

export const weeksAndDaysBetween = (start: Date, end: Date) => {
  const daysDiff = differenceInCalendarDays(normalizedLocalDate(end), normalizedLocalDate(start))
  return [daysToWeeks(daysDiff) + 1, (daysDiff % 7) + 1]
}

export const formatWeekAndDayKey = (start: Date, end: Date) => {
  const [week, day] = weeksAndDaysBetween(start, end)
  return `${week > 1 ? `Week ${week}, ` : ''}Day ${day}`
}

export const formatShortDateByProgramWeek = (date: Date, program: Program) => {
  const daysDiff =
    program &&
    program.sessions &&
    program.sessions.length > 0 &&
    program.sessions[0].start &&
    program.sessions[0].start.getTime() < date.getTime()
      ? Math.floor(
          (date.getTime() - (program.sessions[0].start?.getTime() || new Date().getTime())) /
            oneDayMilliseconds
        )
      : 0
  const week = Math.floor(daysDiff / 7)
  const day = daysDiff % 7
  return `${week > 0 ? `Week ${week + 1}, ` : ''}Day ${day + 1}`
}

export const stringifyLoad = ({ type, value }: Load) =>
  type === 'PERCENT' ? `${(value * 100).toFixed(2)}%` : `RPE ${value}`

export const stringifyWeight = (weight: Weight) => `${weight.value} ${weight.unit}`

export const spaceReplace = (str: string) => str.replace(/\u00a0/, '\u0020')

export const round5 = (value: number) => Math.round(value / 5) * 5

export const sortByName = (rows: { name?: string }[]) =>
  rows.sort((a, b) => {
    const nameA = a.name ? a.name.toUpperCase() : '' // ignore upper and lowercase
    const nameB = b.name ? b.name.toUpperCase() : '' // ignore upper and lowercase
    if (nameA < nameB) {
      return -1 // nameA comes first
    }
    if (nameA > nameB) {
      return 1 // nameB comes first
    }
    return 0 // names must be equal
  })

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
