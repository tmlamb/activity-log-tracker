import { AntDesign } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { ClassInput } from 'twrnc/dist/esm/types'
import { v4 as uuidv4 } from 'uuid'
import create from 'zustand'
import tw from '../tailwind'
import { Exercise, ExerciseSelectNavParams, Load, LoadFormNavParams } from '../types'
import ButtonContainer from './ButtonContainer'
import CardInfo from './CardInfo'
import { ExerciseSelectNavigationProp } from './Navigation/ExerciseSelectModal'
import { LoadFormNavigationProp } from './Navigation/LoadFormModal'
import { SecondaryText } from './Typography'

// Renders a form input field that, when clicked, opens a modal that
// can be used to capture additional user input, the result of which
// can be processed by the parent form via a similar interface to
// a typical input field's "onChangeSelect" callback.

// TODO: can any of this be better abstracted to reduce the number of things needed here?
type ModalSelectEntity = Exercise | Load
type ModalSelectNavigationProp = ExerciseSelectNavigationProp | LoadFormNavigationProp
type ModalSelectNavParams =
  | Omit<ExerciseSelectNavParams, 'onChangeSelectKey'>
  | Omit<LoadFormNavParams, 'onChangeSelectKey'>
type ModalSelectScreen = 'ExerciseSelectModal' | 'LoadFormModal'

type Props<T extends ModalSelectEntity> = {
  label?: string
  // stringify?: (value: T) => string
  value?: string
  style?: ClassInput
  onChangeSelect: (value: T) => void
  placeholder?: string
  textStyle?: ClassInput

  // modalParams: Omit<ModalSelectParams<T>, 'onChangeSelectKey'>
  modalParams: ModalSelectNavParams
  modalScreen: ModalSelectScreen
}

// Ideally the onChangeSelect callback could have been passed directly to the modal,
// through it's navigation route props. However, React navigation does not recommend
// non-serializable values in params. zustand is used here to lift the state to work
// around this.

interface ModalSelectState<T> {
  onChangeSelectMap: Map<string, (value: T) => void>
  setOnChangeSelect: (key: string, onChangeSelect: (value: T) => void) => void
}

export const useModalSelectStore = create<ModalSelectState<any>>(set => ({
  onChangeSelectMap: new Map<string, (value: any) => void>(),
  setOnChangeSelect: (key: string, onChangeSelect: (value: any) => void) =>
    set(state => ({
      onChangeSelectMap: state.onChangeSelectMap.set(key, onChangeSelect) // , {key, onChangeSelect}}
    }))
}))

export default function ModalSelectInput<T extends Exercise | Load>({
  label,
  style,
  onChangeSelect,
  placeholder,
  value,
  // stringify,
  textStyle,
  modalParams,
  modalScreen
}: Props<T>) {
  const navigation = useNavigation<ModalSelectNavigationProp>()

  const setOnChangeSelect = useModalSelectStore(state => state.setOnChangeSelect)

  const [onChangeSelectKey] = React.useState(uuidv4())

  React.useEffect(() => {
    setOnChangeSelect(onChangeSelectKey, onChangeSelect)
    // return () => {
    // console.log('destroy store')
    // useModalSelectStore.destroy()
    // }
  }, [onChangeSelectKey, onChangeSelect, setOnChangeSelect])

  return (
    <ButtonContainer
      style={tw``}
      onPress={() => {
        navigation.navigate(modalScreen, { onChangeSelectKey, ...modalParams })
      }}
    >
      <CardInfo
        style={tw.style(style)}
        textStyle={tw.style(textStyle)}
        primaryText={label}
        secondaryText={
          // (!placeholder && modalParams.value && stringify && stringify(modalParams.value)) as string
          !placeholder && value ? value : undefined
        }
        specialText={
          (!value ? placeholder : undefined) || value
          // (value && placeholder && stringify && stringify(modalParams.value))
        }
        rightIcon={
          <SecondaryText style={tw`mt-0.5`}>
            <AntDesign name="right" size={16} />
          </SecondaryText>
        }
        reverse={placeholder ? true : undefined}
      />
    </ButtonContainer>
  )
}

ModalSelectInput.defaultProps = {
  label: undefined,
  style: undefined,
  value: undefined,
  textStyle: undefined,
  placeholder: undefined
}
