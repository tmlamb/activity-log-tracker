import { differenceInSeconds } from 'date-fns'
import React from 'react'
import tw from '../tailwind'
import { PrimaryText, SecondaryText, ThemedView } from './Themed'

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
    differenceInSeconds(end ? end.getTime() : Date.now(), start.getTime())
  )

  React.useEffect(() => {
    const timer = () => {
      setElapsedTimeSeconds(differenceInSeconds(end ? end.getTime() : Date.now(), start.getTime()))
    }

    if (status === 'Ready' && start) {
      const id = setInterval(timer, 1000)
      return () => {
        clearInterval(id)
      }
    }
    setElapsedTimeSeconds(differenceInSeconds(end ? end.getTime() : Date.now(), start.getTime()))

    return undefined
  }, [elapsedTimeSeconds, start, end, status])

  const formattedTime = showHours
    ? `${String(Math.floor(elapsedTimeSeconds / 60 / 60)).padStart(2, '0')}:${String(
        Math.floor(elapsedTimeSeconds / 60) % 60
      ).padStart(2, '0')}:${String(elapsedTimeSeconds % 60).padStart(2, '0')}`
    : `${String(Math.floor(elapsedTimeSeconds / 60)).padStart(2, '0')}:${String(
        elapsedTimeSeconds % 60
      ).padStart(2, '0')}`

  return (
    <ThemedView style={tw`rounded-b-xl`}>
      <PrimaryText>Elapsed Time</PrimaryText>
      <SecondaryText>{formattedTime}</SecondaryText>
    </ThemedView>
  )
}
ElapsedTime.defaultProps = {
  end: undefined,
  showHours: false
}
