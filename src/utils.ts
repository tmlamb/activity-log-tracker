import { Load, Session, Weight } from './types'

export const isToday = (date?: Date) => {
  const today = new Date()
  return (
    date &&
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

export const mapSessionsByDate = (
  sessions: Session[],
  dateFormatCallback: (date: Date) => string
) => {
  const map = new Map<string, Session[]>()
  sessions.forEach(session => {
    const dateKey = dateFormatCallback(session.start)
    if (!map.has(dateKey)) {
      map.set(dateKey, [])
    }
    map.get(dateKey)?.push(session)
  })
  return map
}

export const stringifyLoad = (load: Load) =>
  load.type === 'PERCENT' ? `${load.value * 100}%` : `RPE ${load.value}`

export const stringifyWeight = (weight: Weight) => `${weight.value} ${weight.unit}`

export const round5 = (value: number) => Math.round(value / 5) * 5
