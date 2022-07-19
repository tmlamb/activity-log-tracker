import { AntDesign } from '@expo/vector-icons'
import { RouteProp, useRoute } from '@react-navigation/native'
import React from 'react'
import { ClassInput } from 'twrnc/dist/esm/types'
import tw from '../tailwind'
import { Exercise, Load, Session } from '../types'
import CardInfo from './CardInfo'
import LinkButton from './LinkButton'
import {
  ExerciseSelectNavParams,
  LoadFormNavParams,
  ModalSelectResponseParams,
  RootStackParamList,
  SessionSelectNavParams
} from './Navigation'
import { SecondaryText } from './Typography'

// Renders a form input field that, when clicked, opens a modal that
// can be used to capture additional user input, the result of which
// can be processed by the parent form via a similar interface to
// a typical input field's "onChangeSelect" callback.

// TODO: can any of this be better abstracted to reduce the number of things needed here?
type ModalSelectEntity = Exercise | Load | Session
type ModalSelectNavParams =
  | Omit<Omit<ExerciseSelectNavParams, 'parentScreen'>, 'parentParams'>
  | Omit<Omit<LoadFormNavParams, 'parentScreen'>, 'parentParams'>
  | Omit<Omit<SessionSelectNavParams, 'parentScreen'>, 'parentParams'>
type ModalSelectScreen = 'ExerciseSelectModal' | 'LoadFormModal' | 'SessionSelectModal'

type Props<T, K> = {
  label?: string
  value?: string
  style?: ClassInput
  onChangeSelect: (value: T) => void
  placeholder?: string
  textStyle?: ClassInput
  modalParams: ModalSelectNavParams
  modalScreen: ModalSelectScreen
  disabled?: boolean
  labelPosition?: 'left' | 'center'
  rightIcon?: JSX.Element
  beforeNavigation?: () => void
}

export default function ModalSelectInput<
  T extends ModalSelectEntity,
  K extends keyof RootStackParamList
>({
  label,
  style,
  onChangeSelect,
  placeholder,
  value,
  textStyle,
  modalParams,
  modalScreen,
  disabled,
  labelPosition,
  rightIcon,
  beforeNavigation
}: Props<T, K>) {
  const route = useRoute<RouteProp<RootStackParamList, K>>()

  const { modalSelectValue, modalSelectId } = route.params as Readonly<ModalSelectResponseParams<T>>

  React.useEffect(() => {
    if (
      modalSelectValue &&
      modalSelectId &&
      modalSelectId === modalParams.modalSelectId &&
      JSON.stringify(modalSelectValue) !== JSON.stringify(modalParams.value)
    ) {
      onChangeSelect(modalSelectValue)
    }
  }, [
    modalParams.modalSelectId,
    modalParams.value,
    modalSelectId,
    modalSelectValue,
    onChangeSelect
  ])

  return (
    <LinkButton
      to={{
        screen: modalScreen,
        params: { parentScreen: route.name, parentParams: route.params, ...modalParams }
      }}
      beforeNavigation={beforeNavigation}
      disabled={disabled}
    >
      <CardInfo
        style={tw.style(style)}
        textStyle={tw.style(textStyle)}
        primaryText={!labelPosition || labelPosition === 'left' ? label : undefined}
        centeredText={labelPosition === 'center' ? label : undefined}
        secondaryText={value && placeholder ? undefined : value}
        specialText={value && placeholder ? value : placeholder || undefined}
        rightIcon={
          rightIcon || (
            <SecondaryText style={tw`mt-0.5`}>
              <AntDesign name="right" size={16} />
            </SecondaryText>
          )
        }
        reverse={placeholder ? true : undefined}
      />
    </LinkButton>
  )
}

ModalSelectInput.defaultProps = {
  label: undefined,
  style: undefined,
  value: undefined,
  textStyle: undefined,
  placeholder: undefined,
  disabled: false,
  labelPosition: 'left',
  rightIcon: undefined,
  beforeNavigation: undefined
}
