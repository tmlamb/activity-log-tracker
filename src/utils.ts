import { Load, Session, Weight } from './types'

export const mapSessionsByDate = (
  sessions: Session[],
  dateFormatCallback: (date: Date) => string
) => {
  const map = new Map<string, Session[]>()
  sessions.forEach(session => {
    const dateKey = dateFormatCallback(session.start || new Date())
    if (!map.has(dateKey)) {
      map.set(dateKey, [])
    }
    map.get(dateKey)?.push(session)
  })
  return map
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
