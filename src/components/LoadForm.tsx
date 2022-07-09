import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { LogBox, View } from 'react-native'
import { tw } from '../tailwind'
import { Load } from '../types'
import Picker from './ActivitiesInput/Picker'
import ButtonContainer from './ButtonContainer'
import HeaderRightContainer from './HeaderRightContainer'
import TextInput from './TextInput'
import { primaryTextColor, SpecialText } from './Typography'

// TODO: Address problem with non-serializable navigation prop (see onSelect function), then remove this ignore statement
LogBox.ignoreLogs(['Non-serializable values were found in the navigation state'])

type Props = {
  load?: Load
  onSelect: (load: Load) => void
}

export default function LoadForm({ load, onSelect }: Props) {
  const navigation = useNavigation()
  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
    setValue
  } = useForm<Partial<Load>>({
    defaultValues: {
      type: load && load.type,
      value: load && load.value
    }
  })
  const type = watch('type')

  const onSubmit = (data: Partial<Load>) => {
    onSelect({ type: data.type!, value: data.value || 0 })
    navigation.goBack()
  }

  const percentNumToString = (value: number | undefined) => {
    // decimalString in 0.XXXX format
    const decimalString = String(value)

    // get the digits after the decimal place
    const decimalDigits = Number(decimalString.split('.')[1])

    // If the digits are greater than 9, then the user has already entered at least '10',
    // and we can go ahead and add a decimal for them.
    // If the digits are less than or equal to 9, then we know there is no chance of a fraction yet
    // and the whole value can be used with no decimal.
    const normalizedValue =
      decimalDigits > 9
        ? `${decimalString.slice(2, 4)}.${decimalString.slice(4)}`
        : decimalString.slice(2)

    // There may be leading zeroes if the percentage is less than ten. This trims them.
    return normalizedValue.replace(/^0+/, '')
  }

  // Converts the percent string to it's numeric value. The old value is needed to detect the case where
  // the value to the left of the decimal is getting deleted.
  const percentStringToNum = (value: string, oldValue: string) => {
    // First convert value from XX.XX format to 0.XXXX
    const decimalValue = `0.${value.length === 1 ? '0' : ''}${value.replace('.', '')}`
    // If the value is unchanged and the field length is less than 5, then the user has
    // used the backspace key to delete the decimal point. Since we are adding the decimal
    // point automatically for the user, it's only good manners to delete it for them automatically,
    // along with the next character, which they are most likely expecting to be deleted.
    if (decimalValue === oldValue && oldValue.length < 5) {
      return decimalValue.slice(0, -1)
    }
    return decimalValue
  }

  return (
    <>
      <HeaderRightContainer>
        <ButtonContainer onPress={handleSubmit(onSubmit)} disabled={!isValid}>
          <SpecialText style={tw`font-bold`}>Done</SpecialText>
        </ButtonContainer>
      </HeaderRightContainer>
      <View>
        <Controller
          control={control}
          rules={{
            required: true
          }}
          render={({ field: { onChange, value } }) => (
            <Picker
              label="Load Type"
              items={[
                { label: 'RPE', value: 'RPE', color: tw.style(primaryTextColor).color as string },
                {
                  label: 'Percent',
                  value: 'PERCENT',
                  color: tw.style(primaryTextColor).color as string
                }
              ]}
              onValueChange={v => {
                setValue('value', 0)
                onChange(v)
              }}
              value={value}
              style={tw`px-3 mb-9`}
            />
          )}
          name="type"
        />
        {type === 'RPE' && (
          <Controller
            control={control}
            rules={{
              required: true,
              min: 1,
              max: 10
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="RPE Value"
                onChangeText={onChange}
                onBlur={onBlur}
                value={(value && String(value)) || undefined}
                placeholder="0"
                maxLength={2}
                style={tw`px-0 py-0`}
                textInputStyle={tw`px-3 py-2.5 text-right`}
                keyboardType="number-pad"
                selectTextOnFocus
                clearTextOnFocus
                numeric
              />
            )}
            name="value"
          />
        )}
        {type === 'PERCENT' && (
          <Controller
            control={control}
            rules={{
              required: true,
              min: 0.001,
              max: 0.999
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="% of One Rep Max"
                onChangeText={newValue => {
                  onChange(percentStringToNum(newValue, String(value)))
                  // const normalizedNewValue = `0.${
                  //   newValue.length === 1 ? '0' : ''
                  // }${newValue.replace('.', '')}`

                  // if (normalizedNewValue === String(value) && String(value).length < 5) {
                  //   onChange(normalizedNewValue.slice(0, -1))
                  // } else {
                  //   onChange(normalizedNewValue)
                  // }
                }}
                onBlur={onBlur}
                value={percentNumToString(value)}
                placeholder="00.00"
                maxLength={5}
                style={tw`px-0 py-0 `}
                textInputStyle={tw`px-3 py-2.5 web:w-1/4`}
                keyboardType="number-pad"
                selectTextOnFocus
                clearTextOnFocus
                numeric
              />
            )}
            name="value"
          />
        )}
      </View>
    </>
  )
}

LoadForm.defaultProps = {
  load: undefined
}
