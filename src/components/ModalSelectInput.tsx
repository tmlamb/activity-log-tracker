import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { ClassInput } from 'twrnc/dist/esm/types'
import { v4 as uuidv4 } from 'uuid'
import create from 'zustand'
import tw from '../tailwind'
import { Exercise, Load } from '../types'
import CardInfo from './CardInfo'
import LinkButton from './LinkButton'
import { ExerciseSelectNavParams, LoadFormNavParams } from './Navigation'
import { SecondaryText } from './Typography'

// Renders a form input field that, when clicked, opens a modal that
// can be used to capture additional user input, the result of which
// can be processed by the parent form via a similar interface to
// a typical input field's "onChangeSelect" callback.

// TODO: can any of this be better abstracted to reduce the number of things needed here?
type ModalSelectEntity = Exercise | Load
type ModalSelectNavParams =
  | Omit<ExerciseSelectNavParams, 'onChangeSelectKey'>
  | Omit<LoadFormNavParams, 'onChangeSelectKey'>
type ModalSelectScreen = 'ExerciseSelectModal' | 'LoadFormModal'

type Props<T extends ModalSelectEntity> = {
  label?: string
  value?: string
  style?: ClassInput
  onChangeSelect: (value: T) => void
  placeholder?: string
  textStyle?: ClassInput
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
      onChangeSelectMap: state.onChangeSelectMap.set(key, onChangeSelect)
    }))
}))

export default function ModalSelectInput<T extends Exercise | Load>({
  label,
  style,
  onChangeSelect,
  placeholder,
  value,
  textStyle,
  modalParams,
  modalScreen
}: Props<T>) {
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
    <LinkButton to={{ screen: modalScreen, params: { onChangeSelectKey, ...modalParams } }}>
      <CardInfo
        style={tw.style(style)}
        textStyle={tw.style(textStyle)}
        primaryText={label}
        secondaryText={value && placeholder ? undefined : value}
        specialText={value && placeholder ? value : placeholder || undefined}
        rightIcon={
          <SecondaryText style={tw`mt-0.5`}>
            <AntDesign name="right" size={16} />
          </SecondaryText>
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
  placeholder: undefined
}
