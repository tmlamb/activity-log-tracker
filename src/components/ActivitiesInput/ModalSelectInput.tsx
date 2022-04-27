import { AntDesign } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Noop } from 'react-hook-form'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../../tailwind'
import { Load } from '../../types'
import ButtonContainer from '../ButtonContainer'
import CardInfo from '../CardInfo'
import { ExerciseSelectNavigationProp } from '../Navigation/ExerciseSelectModal'
import { LoadFormNavigationProp } from '../Navigation/LoadFormModal'
import { SecondaryText } from '../Typography'

type Props = {
  label?: string
  value?: Load | string
  stringify?: (value: any) => string
  style?: ClassInput
  onChangeSelect: ((value: Load) => void) | ((value: string) => void)
  onBlur: Noop
  placeholder?: string
  textStyle?: ClassInput
  screen: 'ExerciseSelectModal' | 'LoadFormModal'
}

// interface PropsFilled extends Props {
//   stringify: (value: any) => string
// }

export default function ModalSelectInput({
  label,
  value,
  style,
  onChangeSelect,
  onBlur,
  screen,
  placeholder,
  stringify,
  textStyle
}: Props) {
  const navigation = useNavigation<LoadFormNavigationProp | ExerciseSelectNavigationProp>()

  const params =
    screen === 'ExerciseSelectModal'
      ? {
          value: value && (value as string),
          onChangeSelect: onChangeSelect as (value: string) => void
        }
      : { value: value as Load, onChangeSelect: onChangeSelect as (value: Load) => void }

  // console.log(params)

  return (
    <>
      {/* <SelectModalNavigationLink screen={screen} navigationParams={{ value, onChangeSelect }}>
        <CardInfo
          style={tw.style(style)}
          textStyle={tw.style(tw.style(textStyle))}
          primaryText={label}
          secondaryText={value && stringify(value)}
          rightIcon={
            <SecondaryText>
              <AntDesign name="right" size={16} />
            </SecondaryText>
          }
        />
      </SelectModalNavigationLink> */}
      <ButtonContainer style={tw``} onPress={() => navigation.navigate(screen, params)}>
        <CardInfo
          style={tw.style(style)}
          textStyle={tw.style(textStyle)}
          primaryText={label}
          secondaryText={value && stringify && stringify(value)}
          specialText={!value ? placeholder : undefined}
          rightIcon={
            <SecondaryText>
              <AntDesign name="right" size={16} />
            </SecondaryText>
          }
          reverse={placeholder ? true : undefined}
        />
      </ButtonContainer>
    </>
  )
}

ModalSelectInput.defaultProps = {
  label: undefined,
  value: undefined,
  style: undefined,
  stringify: undefined,
  textStyle: undefined,
  placeholder: undefined
}
