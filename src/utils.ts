import { Session } from './types'

export const isToday = (date: Date) => {
  const today = new Date()
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  )
}

export const mapSessionsByDate = (sessions: Session[]) => {
  const map = new Map<string, Session[]>()
  sessions.forEach(session => {
    const date = isToday(session.start) ? 'Today' : session.start.toLocaleDateString()
    // const date = session.start.toLocaleDateString()
    if (!map.has(date)) {
      map.set(date, [])
    }
    map.get(date)?.push(session)
  })
  return map
}
