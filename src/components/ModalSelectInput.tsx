import { RouteProp, useRoute } from '@react-navigation/native'
import React from 'react'
import { AccessibilityValue, View } from 'react-native'
import Animated, { FadeInUp, FadeOut } from 'react-native-reanimated'
import { ClassInput } from 'twrnc/dist/esm/types'
import tw from '../tailwind'
import { Exercise, Load, Session } from '../types'
import LinkButton from './LinkButton'
import {
  ExerciseSelectNavParams,
  LoadFormNavParams,
  ModalSelectResponseParams,
  RootStackParamList,
  SessionSelectNavParams
} from './Navigation'
import { AlertText, PrimaryText, SecondaryText, SpecialText, ThemedView } from './Themed'

// Renders a form input field that, when clicked, opens a modal that
// can be used to capture additional user input, the result of which
// can be processed by the parent form via a similar interface to
// a typical input field's "onChangeSelect" callback.

// This design maintains serializability of React Navigation screen
// state, otherwise simply passing onChangeSelect to the modal would
// have worked (functions are not serializable).

type ModalSelectEntity = Exercise | Load | Session
type ModalSelectNavParams =
  | Omit<Omit<ExerciseSelectNavParams, 'parentScreen'>, 'parentParams'>
  | Omit<Omit<LoadFormNavParams, 'parentScreen'>, 'parentParams'>
  | Omit<Omit<SessionSelectNavParams, 'parentScreen'>, 'parentParams'>
type ModalSelectScreen = 'ExerciseSelectModal' | 'LoadFormModal' | 'SessionSelectModal'

type Props<T> = {
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
  icon?: React.ReactNode
  beforeNavigation?: () => void
  error?: string
  errorStyle?: ClassInput
  accessibilityLabel?: string
  accessibilityValue?: AccessibilityValue
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
  icon,
  beforeNavigation,
  error,
  errorStyle,
  accessibilityLabel,
  accessibilityValue
}: Props<T>) {
  const route = useRoute<RouteProp<RootStackParamList, K>>()

  const { modalSelectValue, modalSelectId } = route.params as Readonly<ModalSelectResponseParams<T>>

  // Processes the "output" sent back to the originating screen by the modal select screen.
  React.useEffect(() => {
    // We need to avoid unnecessary renders (or infinite loops) by only processing the
    // modalSelectValue under specific circumstances:
    if (
      modalSelectValue && // there is a modal selection value passed in the route
      modalSelectId && // and there is an id for this instance passed in the route
      modalSelectId === modalParams.modalSelectId && // and the id matches this instance's id
      JSON.stringify(modalSelectValue) !== JSON.stringify(modalParams.value) // and the value has changed
    ) {
      // Trigger the modal select callback to process the value
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
    <View style={tw`relative`}>
      <LinkButton
        to={{
          screen: modalScreen,
          params: { parentScreen: route.name, parentParams: route.params, ...modalParams }
        }}
        beforeNavigation={beforeNavigation}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={accessibilityValue}
      >
        <ThemedView
          style={tw.style(placeholder ? 'justify-end flex-row-reverse' : undefined, style)}
        >
          {(!labelPosition || labelPosition === 'left') && (
            <PrimaryText style={tw.style(textStyle)}>{label}</PrimaryText>
          )}
          {labelPosition === 'center' && (
            <SecondaryText style={tw.style(textStyle)}>{label}</SecondaryText>
          )}
          {value && (
            <SecondaryText
              style={tw.style(
                'web:w-0 web:flex-grow web:flex-1',
                label ? 'text-right' : '',
                textStyle
              )}
            >
              {value}
            </SecondaryText>
          )}
          {!value && placeholder && (
            <SpecialText style={tw.style(textStyle)}>{placeholder}</SpecialText>
          )}
          {icon && (
            <View
              style={tw.style(
                'absolute pt-0.5 web:pt-0',
                placeholder
                  ? 'ios:left-1.5 android:left-1.5 web:right-1.5'
                  : 'right-1.5 web:right-1.5'
              )}
            >
              {icon}
            </View>
          )}
        </ThemedView>
      </LinkButton>
      {error && (
        <Animated.View
          entering={FadeInUp.springify().stiffness(50).damping(6).mass(0.3)}
          exiting={FadeOut.springify().stiffness(50).damping(6).mass(0.3)}
          style={[tw.style('left-3 top-8 absolute', errorStyle)]}
        >
          <AlertText style={tw.style('text-sm', errorStyle)}>{error}</AlertText>
        </Animated.View>
      )}
    </View>
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
  icon: undefined,
  beforeNavigation: undefined,
  error: undefined,
  errorStyle: undefined,
  accessibilityLabel: undefined,
  accessibilityValue: undefined
}
