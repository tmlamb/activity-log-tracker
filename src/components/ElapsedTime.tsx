import React from 'react'
import tw from '../tailwind'
import CardInfo from './CardInfo'

export default function ElapsedTime({
  start,
  end,
  status,
  showHours
}: {
  start: Date
  end?: Date
  status: string
  showHours?: boolean
}) {
  const [elapsedTimeSeconds, setElapsedTimeSeconds] = React.useState(
    // eslint-disable-next-line no-nested-ternary
    start
      ? end
        ? Math.ceil((end.getTime() - start.getTime()) / 1000)
        : Math.ceil((Date.now() - start.getTime()) / 1000)
      : 0
  )

  React.useEffect(() => {
    const timer = () => {
      setElapsedTimeSeconds(Math.ceil((Date.now() - start.getTime()) / 1000))
      //   setElapsedTimeSeconds(elapsedTimeSeconds + 1)
    }

    if (status === 'Ready' && start) {
      const id = setInterval(timer, 1000)
      return () => {
        clearInterval(id)
      }
    }
    return undefined
  }, [elapsedTimeSeconds, start, status])

  const formattedTime = showHours
    ? `${String(Math.floor(elapsedTimeSeconds / 60 / 60)).padStart(2, '0')}:${String(
        Math.floor(elapsedTimeSeconds / 60) % 60
      ).padStart(2, '0')}:${String(elapsedTimeSeconds % 60).padStart(2, '0')}`
    : `${String(Math.floor(elapsedTimeSeconds / 60)).padStart(2, '0')}:${String(
        elapsedTimeSeconds % 60
      ).padStart(2, '0')}`

  return (
    <CardInfo primaryText="Elapsed Time" secondaryText={formattedTime} style={tw`rounded-b-xl`} />
  )
}
ElapsedTime.defaultProps = {
  end: undefined,
  showHours: false
}
