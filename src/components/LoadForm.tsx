import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { FlatList, View } from 'react-native'
import { tw } from '../tailwind'
import { Exercise, Load } from '../types'
import Picker from './ActivitiesInput/Picker'
import ButtonContainer from './ButtonContainer'
import HeaderLeftContainer from './HeaderLeftContainer'
import HeaderRightContainer from './HeaderRightContainer'
import TextInput from './TextInput'
import { alertTextColor, primaryTextColor, SecondaryText, SpecialText } from './Typography'

type Props = {
  load?: Load
  exercise?: Exercise
  updateExercise: (exercise: Exercise) => void
  onSelect: (value: Load) => void
}

type FormData = Partial<Load> & { oneRepMaxVal: number }

export default function LoadForm({ load, exercise, updateExercise, onSelect }: Props) {
  const navigation = useNavigation()
  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid },
    setValue
  } = useForm<FormData>({
    defaultValues: {
      type: load && load.type,
      value: load && load.value,
      oneRepMaxVal: exercise?.oneRepMax?.value
    }
  })
  const type = watch('type')
  const onSubmit = (data: FormData) => {
    if (data.type === 'PERCENT' && exercise && !exercise.oneRepMax && !data.oneRepMaxVal) {
      return
    }

    if (data.type === 'PERCENT' && exercise && data.oneRepMaxVal) {
      updateExercise({ ...exercise, oneRepMax: { value: data.oneRepMaxVal, unit: 'lbs' } })
    }

    onSelect({
      type: data.type!,
      value: data.value || 0
    })
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
    // point automatically for the user, we should also delete it for them automatically,
    // along with the next character, which they are most likely expecting to be deleted.
    if (decimalValue === oldValue && oldValue.length < 5) {
      return decimalValue.slice(0, -1)
    }
    return decimalValue
  }

  return (
    <>
      <HeaderRightContainer>
        <ButtonContainer onPress={handleSubmit(onSubmit)}>
          <SpecialText style={tw`font-bold`}>Done</SpecialText>
        </ButtonContainer>
      </HeaderRightContainer>
      <HeaderLeftContainer>
        <ButtonContainer
          onPress={() => {
            navigation.goBack()
          }}
        >
          <SpecialText>Cancel</SpecialText>
        </ButtonContainer>
      </HeaderLeftContainer>
      <View style={tw`flex-grow py-9`}>
        <Controller
          control={control}
          rules={{
            required: true
          }}
          render={({ field: { onChange, value } }) => (
            <Picker
              label="Load Type"
              items={[
                {
                  label: 'RPE',
                  value: 'RPE',
                  color: tw.style(primaryTextColor).color as string
                },
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
              style={tw`px-3`}
            />
          )}
          name="type"
        />
        {type === 'RPE' && (
          <>
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
                  style={tw`px-0 py-0 mt-9`}
                  textInputStyle={tw`px-3 py-2.5 text-right`}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  // clearTextOnFocus
                  numeric
                />
              )}
              name="value"
            />
            <View>
              <FlatList
                data={[
                  { key: 'Measures intensity of a given weight and number of reps' },
                  { key: 'Values are on 1 - 10 scale:' },
                  { key: '\u2022 10 - another rep would have been impossible' },
                  { key: '\u2022 9 - you left one in the tank' },
                  { key: '\u2022 8 - you could have done a couple more' },
                  { key: '\u2022 etc...' }
                ]}
                ListHeaderComponent={
                  <SecondaryText style={tw`mt-9 text-sm px-3 mb-1.5`}>
                    Rate of Perceived Exertion scale
                  </SecondaryText>
                }
                renderItem={({ item }) => (
                  <View style={tw`flex-wrap flex-row items-center justify-start ml-6`}>
                    {/* <SecondaryText style={tw`text-lg ml-0`}>{'\u2022'}</SecondaryText> */}
                    <SecondaryText style={tw`text-xs mb-1`}>{`${item.key}`}</SecondaryText>
                  </View>
                )}
              />
            </View>
          </>
        )}
        {type === 'PERCENT' && (
          <>
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
                  }}
                  onBlur={onBlur}
                  value={percentNumToString(value)}
                  placeholder="00.00"
                  maxLength={5}
                  style={tw`mt-9`}
                  textInputStyle={tw`web:w-1/4`}
                  keyboardType="number-pad"
                  selectTextOnFocus
                  numeric
                />
              )}
              name="value"
            />
            {exercise && !exercise?.oneRepMax && (
              <>
                <SecondaryText style={tw`uppercase px-3 text-sm mt-9 mb-1.5`}>
                  {exercise.name}
                </SecondaryText>
                <Controller
                  control={control}
                  rules={{
                    required: false
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      label="One Rep Max (lbs)"
                      placeholder="Required"
                      placeholderTextColor={tw.color(alertTextColor)}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      value={(value && String(value)) || undefined}
                      maxLength={4}
                      style={tw``}
                      textInputStyle={tw``}
                      keyboardType="number-pad"
                      numeric
                    />
                  )}
                  name="oneRepMaxVal"
                />
                <SecondaryText style={tw`px-3 py-1.5 text-xs`}>
                  Enter a One Rep Max for this exercise in order to use the Percent load type.
                </SecondaryText>
              </>
            )}
          </>
        )}
      </View>
    </>
  )
}

LoadForm.defaultProps = {
  load: undefined,
  exercise: undefined
}
