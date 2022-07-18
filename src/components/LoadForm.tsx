import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { FlatList, View } from 'react-native'
import tw from '../tailwind'
import { Exercise, Load } from '../types'
import ButtonContainer from './ButtonContainer'
import HeaderLeftContainer from './HeaderLeftContainer'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import { RootStackParamList } from './Navigation'
import Picker from './Picker'
import TextInput from './TextInput'
import { alertTextColor, primaryTextColor, SecondaryText, SpecialText } from './Typography'

type Props = {
  load?: Load
  exercise?: Exercise
  updateExercise: (exercise: Exercise) => void
  parentScreen: keyof RootStackParamList
  parentParams: object
  modalSelectId: string
}

type FormData = Partial<Load> & { oneRepMaxVal: number }

export default function LoadForm({
  load,
  exercise,
  updateExercise,
  parentScreen,
  parentParams,
  modalSelectId
}: Props) {
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
    },
    reValidateMode: 'onChange',
    mode: 'onChange'
  })
  const selectedType = watch('type')
  const selectedValue = watch('value')
  const selectedOneRepMaxVal = watch('oneRepMaxVal')
  const [selected, setSelected] = React.useState<Load>()

  React.useEffect(() => {
    const selection =
      selectedType && selectedValue && ({ type: selectedType, value: selectedValue } as Load)
    if (selection && JSON.stringify(selection) !== JSON.stringify(selected)) {
      setSelected(selection)
    }
  }, [selected, selectedType, selectedValue])

  const onSubmit = () => {
    if (selectedType === 'PERCENT' && exercise && selectedOneRepMaxVal) {
      updateExercise({ ...exercise, oneRepMax: { value: selectedOneRepMaxVal, unit: 'lbs' } })
    }
  }

  const percentNumToString = (value?: number) => {
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
        <LinkButton
          to={{
            screen: parentScreen,
            params:
              selected && modalSelectId
                ? {
                    ...parentParams,
                    modalSelectValue: selected,
                    modalSelectId
                  }
                : undefined
          }}
          beforeNavigation={handleSubmit(onSubmit)}
          style={tw`px-4 py-4 -my-4 -mr-4`}
          disabled={!isValid}
        >
          <SpecialText style={tw`font-bold`}>Done</SpecialText>
        </LinkButton>
      </HeaderRightContainer>
      <HeaderLeftContainer>
        <ButtonContainer
          style={tw`py-4 -my-4 px-4 -ml-4`}
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
                  color: tw.style(primaryTextColor).color as string,
                  key: 'RPE'
                },
                {
                  label: 'Percent',
                  value: 'PERCENT',
                  color: tw.style(primaryTextColor).color as string,
                  key: 'PERCENT'
                }
              ]}
              onValueChange={v => {
                setValue('value', 0, { shouldValidate: true })
                onChange(v)
              }}
              value={value}
              style={tw`px-3`}
            />
          )}
          name="type"
        />
        {selectedType === 'RPE' && (
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
                  numeric
                />
              )}
              name="value"
            />
            <FlatList
              data={[
                { key: '10 - another rep would have been impossible' },
                { key: '9 - you left one in the tank' },
                { key: '8 - you could have done a couple more' },
                { key: 'etc...' }
              ]}
              ListHeaderComponent={
                <View style={tw`px-3 mb-1 mt-9`}>
                  <SecondaryText style={tw`text-sm mb-1.5`}>
                    Rate of Perceived Exertion scale (RPE)
                  </SecondaryText>
                  <SecondaryText style={tw`text-xs`}>
                    Measures intensity of a given weight and number of reps. Values are on a 1-10
                    scale:
                  </SecondaryText>
                </View>
              }
              renderItem={({ item }) => (
                <View key={item.key} style={tw`flex-wrap flex-row items-center justify-start ml-7`}>
                  <SecondaryText style={tw`text-xs mb-1`}>{`${item.key}`}</SecondaryText>
                </View>
              )}
            />
          </>
        )}
        {selectedType === 'PERCENT' && (
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
                    required: true
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
            <View style={tw`px-3 mb-1 mt-9`}>
              <SecondaryText style={tw`text-sm mb-1.5`}>One Rep Max (1RM)</SecondaryText>
              <SecondaryText style={tw`text-xs`}>
                Heaviest weight that can be lifted for one rep.
              </SecondaryText>
              <SecondaryText style={tw`text-sm mb-1.5 mt-9`}>% of One Rep Max (%1RM)</SecondaryText>
              <SecondaryText style={tw`text-xs`}>
                A way to quantify the amount to be lifted in a set, proportional to the 1RM.
              </SecondaryText>
            </View>
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
