import { AntDesign } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { ClassInput } from 'twrnc/dist/esm/types'
import { v4 as uuidv4 } from 'uuid'
import create from 'zustand'
import { tw } from '../tailwind'
import { ModalSelectParams } from '../types'
import ButtonContainer from './ButtonContainer'
import CardInfo from './CardInfo'
import { SecondaryText } from './Typography'
// Renders a form input field, that when clicked, opens a modal that
// can be used to create state that can be passed back to the parent form.

type Props<T> = {
  label?: string
  value?: T
  stringify?: (value: T) => string
  style?: ClassInput
  onChangeSelect: (value: T) => void
  placeholder?: string
  textStyle?: ClassInput
  modalParams?: { [key: string]: string | undefined }
  modalScreen: string
}

// interface ModalSelectStateold<T> {
//   selected: T
//   select: (value: T) => void
// }
// // Ideally the onChangeSelect callback could have been passed directly to the modal,
// // however React navigation does not recommend non-serializable values in params.
// // zustand is used here to lift the state to work around this.
// export const useModalSelectStoreold = create<ModalSelectStateold<any>>(set => ({
//   selected: undefined,
//   select: (value: any) => set({ selected })
// }))
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

// interface ModalSelectState2<S> {
//   callback: (value: S) => void
//   setCallback: (callback: (value: S) => void) => void
// }

// const useModalSelectStoreBase = create<ModalSelectState<any>>(set => ({
//   callback: () => null,
//   setCallback: (callback: (value: any) => void) => set({ callback })
// }))

// export const useModalSelectStore2 = <S, Slice>(selector: (state: ModalSelectState<S>) => Slice) =>
//   useModalSelectStoreBase(selector)

// export const useModalSelectStateold = create<ModalSelectState<unknown>>(set => ({
//   callback: () => null,
//   setCallback: (callback: (value: unknown) => void) => set({ callback })
// pushCallback: (callback: (value: object) => void) => {
//   let key = uuidv4()
//   set(
//     state =>
//       //
//       {modalSelectCallbacks: {...modalSelectCall}}
//       // (index = state.modalSelectCallbacks.length({
//       //   modalSelectCallbacks: state.modalSelectCallbacks.concat(callback)
//       // }))
//   )
// }
// }))

// immer(
//   persist(
//     () => ({
//       // exercises: getData()
//       modalSelectCallbacks: {}
//     }),
//     {
//       name: 'modalselect-storage'
//     }
//   )

export default function ModalSelectInput<T>({
  label,
  value,
  style,
  onChangeSelect,
  placeholder,
  stringify,
  textStyle,
  modalParams,
  modalScreen
}: Props<T>) {
  const navigation = useNavigation<ModalSelectParams<T>>()

  // const setCallback = useModalSelectStore2<T, unknown>(state => state.setCallback) as (((value: T) => void) => void)
  // const selected = useModalSelectStore(state => state.selected)
  const setOnChangeSelect = useModalSelectStore(state => state.setOnChangeSelect)

  const [onChangeSelectKey] = React.useState(uuidv4())

  React.useEffect(() => {
    console.log('set store on mount')
    // onChangeSelect(selected)
    setOnChangeSelect(onChangeSelectKey, onChangeSelect)
    // return () => {
    // console.log('destroy store')
    // useModalSelectStore.destroy()
    // }
  }, [onChangeSelectKey, onChangeSelect, setOnChangeSelect])
  // React.useEffect(() => {
  //   console.log('subscribing')
  //   useModalSelectStore.subscribe(state => {
  //     console.log('subscriber received selection', state)

  //     onChangeSelect(state.selected)
  //   })
  // }, [onChangeSelect])

  return (
    <ButtonContainer
      style={tw``}
      onPress={() => {
        // onChangeSelect(selected)
        navigation.navigate(modalScreen, { value, onChangeSelectKey, ...modalParams })
      }}
    >
      <CardInfo
        style={tw.style(style)}
        textStyle={tw.style(textStyle)}
        primaryText={label}
        secondaryText={(!placeholder && value && stringify && stringify(value)) as string}
        specialText={
          (!value ? placeholder : undefined) ||
          (value && placeholder && stringify && stringify(value))
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
  value: undefined,
  style: undefined,
  stringify: undefined,
  textStyle: undefined,
  placeholder: undefined,
  modalParams: undefined
}
