import { weekAndDayFromStart } from './utils'

describe('weekAndDayFromStart', () => {
  it('should consider two equal dates to be day 1', () => {
    const startDate = new Date(2022, 6, 7, 5, 5, 5)
    const endDate = new Date(2022, 6, 7, 5, 5, 5)
    const result = weekAndDayFromStart(startDate, endDate)

    expect(result).toBe('Day 1')
  })
  it('should consider two dates on the same day at different times to be day 1', () => {
    const startDate = new Date(2022, 6, 7, 0, 0, 1)
    const endDate = new Date(2022, 6, 7, 23, 59, 59)
    const result = weekAndDayFromStart(startDate, endDate)

    expect(result).toBe('Day 1')
  })
  it('should return 0 if the end date is before the start date', () => {
    const startDate = new Date(2022, 6, 7, 0, 0, 1)
    const endDate = new Date(2022, 6, 6, 23, 59, 59)
    const result = weekAndDayFromStart(startDate, endDate)

    expect(result).toBe('Day 0')
  })
  it('should consider it to be day 2 when the clock reaches midnight', () => {
    const startDate = new Date(2022, 6, 7, 0, 0, 1)
    const endDate = new Date(2022, 6, 8, 0, 0, 0)
    const result = weekAndDayFromStart(startDate, endDate)

    expect(result).toBe('Day 2')
  })
  it('should consider it to be day 2 at the end of the second day', () => {
    const startDate = new Date(2022, 6, 7, 0, 0, 1)
    const endDate = new Date(2022, 6, 8, 23, 59, 59)
    const result = weekAndDayFromStart(startDate, endDate)

    expect(result).toBe('Day 2')
  })
  it('should consider it to be day 7 when the seventh day is reached', () => {
    const startDate = new Date(2022, 6, 7, 0, 0, 1)
    const endDate = new Date(2022, 6, 13, 0, 0, 0)
    const result = weekAndDayFromStart(startDate, endDate)

    expect(result).toBe('Day 7')
  })
  it('should consider it to be week 2 day 1 when the eighth day is reached', () => {
    const startDate = new Date(2022, 6, 7, 0, 0, 1)
    const endDate = new Date(2022, 6, 14, 0, 0, 0)
    const result = weekAndDayFromStart(startDate, endDate)

    expect(result).toBe('Week 2, Day 1')
  })
  it('should consider it to be week 15 day 6 when the 111th day is reached', () => {
    const startDate = new Date(2022, 6, 7, 0, 0, 1)
    const endDate = new Date(2022, 9, 18, 0, 0, 0)
    const result = weekAndDayFromStart(startDate, endDate)

    expect(result).toBe('Week 15, Day 6')
  })
})
