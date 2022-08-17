import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import Animated, { FadeInDown, FadeInUp, FadeOutDown } from 'react-native-reanimated'
import tw from '../tailwind'
import { Exercise, Load } from '../types'
import ButtonContainer from './ButtonContainer'
import HeaderLeftContainer from './HeaderLeftContainer'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import { RootStackParamList } from './Navigation'
import {
  AlertText,
  alertTextColor,
  PrimaryText,
  SecondaryText,
  SpecialText,
  ThemedTextInput,
  ThemedView
} from './Themed'

type Props = {
  load?: Load
  exercise?: Exercise
  updateExercise: (exercise: Exercise) => void
  parentScreen: keyof RootStackParamList
  parentParams: object
  modalSelectId: string
  goBack: () => void
}

type FormData = Partial<Load> & { oneRepMaxVal: number }

export default function LoadForm({
  load,
  exercise,
  updateExercise,
  parentScreen,
  parentParams,
  modalSelectId,
  goBack
}: Props) {
  const {
    control,
    handleSubmit,
    watch,
    formState: { isValid, errors },
    setValue,
    clearErrors,
    trigger,
    reset
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
    trigger('value')
    clearErrors()
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
          onPress={handleSubmit(onSubmit)}
          disabled={!isValid}
        >
          <SpecialText style={tw.style('font-bold')}>Done</SpecialText>
        </LinkButton>
      </HeaderRightContainer>
      <HeaderLeftContainer>
        <ButtonContainer onPress={goBack}>
          <SpecialText>Cancel</SpecialText>
        </ButtonContainer>
      </HeaderLeftContainer>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 114 : -225}
        behavior="padding"
      >
        <ScrollView style={tw`flex-1`} contentContainerStyle={tw`pt-9 pb-12`}>
          <Controller
            name="type"
            control={control}
            rules={{
              required: true
            }}
            render={({ field: { onChange } }) => (
              <View>
                <ThemedView style={tw`justify-between p-0 relative`}>
                  <ButtonContainer
                    style={tw`flex-row items-stretch w-1/2`}
                    onPress={() => {
                      onChange('RPE')
                      setValue('value', load?.type === 'RPE' ? load.value : 0, {
                        shouldValidate: false
                      })
                      if (load?.type === 'RPE') {
                        reset()
                      }
                    }}
                    accessibilityLabel="Set Load Type to Rate of Perceived Exertion"
                  >
                    <View
                      style={tw.style(
                        'px-3 py-2 w-full items-center justify-center dark:border-slate-700 border-slate-400',
                        selectedType === 'RPE'
                          ? 'border-0 opacity-100'
                          : 'border-0 border-r-0 bg-slate-300 dark:bg-slate-600 opacity-40',
                        !selectedType ? 'border-r-2' : undefined
                      )}
                    >
                      <PrimaryText>RPE</PrimaryText>
                    </View>
                  </ButtonContainer>
                  <ButtonContainer
                    style={tw`flex-row items-stretch w-1/2`}
                    onPress={() => {
                      onChange('PERCENT')
                      clearErrors('value')
                      setValue('value', load?.type === 'PERCENT' ? load.value : 0, {
                        shouldValidate: false
                      })
                      if (load?.type === 'PERCENT') {
                        reset()
                      }
                    }}
                    accessibilityLabel="Set Load Type to Percent of One Rep Max"
                  >
                    <View
                      style={tw.style(
                        'px-3 py-2 w-full items-center justify-center dark:border-slate-700 border-slate-400',
                        selectedType === 'PERCENT'
                          ? 'border-0 opacity-100'
                          : 'border-0 border-r-0 bg-slate-300 dark:bg-slate-600 opacity-40'
                      )}
                    >
                      <PrimaryText>%1RM</PrimaryText>
                    </View>
                  </ButtonContainer>
                </ThemedView>
                {errors && errors.type && (
                  <Animated.View
                    entering={FadeInDown.springify().stiffness(40).damping(6).mass(0.3)}
                    exiting={FadeOutDown.springify().stiffness(40).damping(6).mass(0.3)}
                    pointerEvents="none"
                    style={tw`absolute items-center w-full justify-center -top-4`}
                  >
                    <AlertText style={tw`text-xs`}>Select a type</AlertText>
                  </Animated.View>
                )}
              </View>
            )}
          />
          {selectedType === 'RPE' && (
            <Animated.View
              entering={FadeInUp.duration(1000).springify().stiffness(50).damping(6).mass(0.3)}
              exiting={FadeOutDown.duration(1000).springify().stiffness(50).damping(6).mass(0.3)}
            >
              <Controller
                name="value"
                control={control}
                rules={{
                  required: true,
                  min: 1,
                  max: 10
                }}
                render={({ field: { ref, onChange, onBlur, value } }) => (
                  <ThemedTextInput
                    label="RPE Value"
                    onChangeText={onChange}
                    onBlur={onBlur}
                    innerRef={ref}
                    value={(value && String(value)) || undefined}
                    placeholder="0"
                    maxLength={2}
                    style={tw`mt-9`}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    numeric
                    error={errors.value ? 'RPE value must be between 1 and 10' : undefined}
                  />
                )}
              />
              <View>
                <View style={tw`px-3 mb-1 mt-9`}>
                  <SecondaryText style={tw`text-sm font-bold mb-1.5`}>
                    Rate of Perceived Exertion scale (RPE)
                  </SecondaryText>
                  <SecondaryText style={tw`text-xs`}>
                    Measures intensity of a given weight and number of reps. Values are on a 1 to 10
                    scale:
                  </SecondaryText>
                </View>
                <View style={tw`flex-wrap flex-row items-center justify-start ml-7`}>
                  <SecondaryText style={tw`text-xs mb-1`}>
                    10 - another rep would have been impossible
                  </SecondaryText>
                </View>
                <View style={tw`flex-wrap flex-row items-center justify-start ml-7`}>
                  <SecondaryText style={tw`text-xs mb-1`}>
                    9 - you left one in the tank
                  </SecondaryText>
                </View>
                <View style={tw`flex-wrap flex-row items-center justify-start ml-7`}>
                  <SecondaryText style={tw`text-xs mb-1`}>
                    8 - you could have done a couple more
                  </SecondaryText>
                </View>
                <View style={tw`flex-wrap flex-row items-center justify-start ml-7`}>
                  <SecondaryText style={tw`text-xs mb-1`}>etc...</SecondaryText>
                </View>
              </View>
            </Animated.View>
          )}
          {selectedType === 'PERCENT' && (
            <Animated.View
              entering={FadeInUp.duration(1000).springify().stiffness(50).damping(6).mass(0.3)}
              exiting={FadeOutDown.duration(1000).springify().stiffness(50).damping(6).mass(0.3)}
            >
              <Controller
                name="value"
                control={control}
                rules={{
                  required: true,
                  min: 0.001,
                  max: 0.9999
                }}
                render={({ field: { ref, onChange, onBlur, value } }) => (
                  <ThemedTextInput
                    label="% of One Rep Max"
                    onChangeText={newValue => {
                      onChange(percentStringToNum(newValue, String(value)))
                    }}
                    onBlur={onBlur}
                    innerRef={ref}
                    value={value ? percentNumToString(value) : undefined}
                    placeholder="00.00"
                    maxLength={5}
                    style={tw`mt-9`}
                    keyboardType="number-pad"
                    selectTextOnFocus
                    numeric
                    error={errors.value ? '%1RM value is required' : undefined}
                  />
                )}
              />
              {exercise && (
                <Animated.View
                  entering={FadeInUp.delay(250)
                    .duration(1000)
                    .springify()
                    .stiffness(50)
                    .damping(6)
                    .mass(0.3)}
                  exiting={FadeOutDown.delay(100)
                    .duration(1000)
                    .springify()
                    .stiffness(50)
                    .damping(6)
                    .mass(0.3)}
                >
                  <SecondaryText style={tw`uppercase mx-3 text-sm mt-9 mb-1.5`}>
                    {exercise.name}
                  </SecondaryText>
                  <Controller
                    control={control}
                    rules={{
                      required: true,
                      min: 1
                    }}
                    render={({ field: { onChange, onBlur, value } }) => (
                      <ThemedTextInput
                        label="One Rep Max (lbs)"
                        placeholder="Required"
                        placeholderTextColor={tw.color(alertTextColor)}
                        onChangeText={onChange}
                        onBlur={onBlur}
                        value={(value && String(value)) || undefined}
                        maxLength={4}
                        keyboardType="number-pad"
                        numeric
                        accessibilityLabel="One Rep Max in pounds"
                      />
                    )}
                    name="oneRepMaxVal"
                  />
                  {(!exercise.oneRepMax || exercise.oneRepMax.value <= 0) && (
                    <SecondaryText style={tw`mx-3 my-1.5 text-xs`}>
                      Enter a One Rep Max for this exercise in order to use the %1RM load type.
                    </SecondaryText>
                  )}
                </Animated.View>
              )}
              <View style={tw`px-3 mb-1 mt-9`}>
                <SecondaryText style={tw`text-sm mb-1.5 font-bold`}>
                  One Rep Max (1RM)
                </SecondaryText>
                <SecondaryText style={tw`text-xs`}>
                  Heaviest weight that can be lifted for one rep.
                </SecondaryText>
                <SecondaryText style={tw`text-sm mb-1.5 mt-9 font-bold`}>
                  % of One Rep Max (%1RM)
                </SecondaryText>
                <SecondaryText style={tw`text-xs`}>
                  A way to quantify the amount to be lifted in a set, proportional to the 1RM.
                </SecondaryText>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}

LoadForm.defaultProps = {
  load: undefined,
  exercise: undefined
}
