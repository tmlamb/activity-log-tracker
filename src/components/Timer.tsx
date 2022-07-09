import React from 'react'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../tailwind'
import ButtonContainer from './ButtonContainer'
import CardInfo from './CardInfo'

type Props = {
  startTimerLabel?: string
  style?: ClassInput
}

export default function Timer({ startTimerLabel, style }: Props) {
  const [timeElapsed, setTimeElapsed] = React.useState()
  const [startTime, setStartTime] = React.useState(false)

  //   React.useEffect(() => {

  //   }, [timeElapsed])

  //   React.useEffect(() => {
  //     setTimeout(() => {
  //       setTimeElapsed(1)
  //     }, 1000)
  //   }, [])

  const toggle = () => {
    // setTimerEvents(prevTimerEvents => [
    //   ...prevTimerEvents,
    //   {
    //     type,
    //     time: new Date()
    //   }
    // ])
  }

  return (
    <ButtonContainer onPress={() => toggle()}>
      <CardInfo
        style={tw.style(style)}
        specialText={startTimerLabel}
        primaryText={String(timeElapsed)}
        reverse
      />
    </ButtonContainer>
  )
}

Timer.defaultProps = {
  startTimerLabel: 'Start',
  style: undefined
}
