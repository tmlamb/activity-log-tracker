import { AntDesign } from '@expo/vector-icons'
import _ from 'lodash'
import React from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native'
import Animated, { FadeInUp, FadeOutUp, Layout } from 'react-native-reanimated'
import { v4 as uuidv4 } from 'uuid'
import tw from '../tailwind'
import { Equipment, Weight } from '../types'
import ButtonContainer from './ButtonContainer'
import HeaderLeftContainer from './HeaderLeftContainer'
import HeaderRightContainer from './HeaderRightContainer'
import { ThemedTextInput, ThemedView } from './Themed'
import { AlertText, SecondaryText, SpecialText } from './Typography'

type Props = {
  equipment: Equipment
  updateEquipment: (equipment: Equipment) => void
  goBack: () => void
}

export default function EquipmentSettings({ equipment, updateEquipment, goBack }: Props) {
  type FormData = Equipment
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: equipment
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'platePairs'
  })

  const onSubmit = (data: FormData) => {
    updateEquipment({
      ...data,
      platePairs: _(data.platePairs)
        .map(
          weight =>
            ({
              value: Number(weight.value),
              unit: 'lbs'
            } as Weight)
        )
        .sortBy(weight => weight.value)
        .value()
    })
    goBack()
  }
  return (
    <>
      <HeaderRightContainer>
        <ButtonContainer onPress={handleSubmit(onSubmit)}>
          <SpecialText style={tw`font-bold`}>Save</SpecialText>
        </ButtonContainer>
      </HeaderRightContainer>
      <HeaderLeftContainer>
        <ButtonContainer onPress={goBack}>
          <SpecialText>Cancel</SpecialText>
        </ButtonContainer>
      </HeaderLeftContainer>
      <KeyboardAvoidingView
        style={tw`flex-1`}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : -225}
        behavior="padding"
      >
        <ScrollView style={tw`flex-grow px-3`} contentContainerStyle={tw`pb-48`}>
          <SecondaryText style={tw`text-xs mt-9 px-3 mb-1.5`}>
            These settings will be used by the Barbell Configuration hints when performing sets
            during workouts.
          </SecondaryText>
          <Controller
            name="barbellWeight"
            control={control}
            rules={{
              required: true
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <ThemedTextInput
                label="Barbell Weight (lbs)"
                onChangeText={newValue => {
                  onChange({
                    value: Number(newValue),
                    unit: 'lbs'
                  })
                }}
                onBlur={onBlur}
                value={value ? String(value.value) : undefined}
                placeholder="0"
                maxLength={3}
                style={tw`rounded-xl mb-6`}
                textInputStyle={tw`text-right web:text-base`}
                labelStyle={tw`web:text-base`}
                keyboardType="number-pad"
                numeric
                selectTextOnFocus
              />
            )}
          />
          <SecondaryText style={tw`text-sm px-3 pb-1.5`}>Plate Pairs (2x each)</SecondaryText>
          {fields.map((item, index) => (
            <Animated.View
              key={uuidv4()}
              entering={FadeInUp.duration(1000).springify().stiffness(50).damping(6).mass(0.3)}
              exiting={FadeOutUp.duration(1000).springify().stiffness(50).damping(6).mass(0.3)}
            >
              <View style={tw`relative justify-between`}>
                <ButtonContainer style={tw`absolute z-1 p-3`} onPress={() => remove(index)}>
                  <AlertText style={tw`p-0`}>
                    <AntDesign name="minuscircle" size={15} />
                  </AlertText>
                </ButtonContainer>
                <Controller
                  name={`platePairs.${index}.value`}
                  control={control}
                  defaultValue={45}
                  rules={{
                    required: true,
                    validate: (value: number) =>
                      !!_.find(
                        ['1.25', '2.5', '5', '10', '15', '25', '35', '45', '55', '65'],
                        v => v === String(value)
                      )
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <ThemedTextInput
                      label="Plate Pair Weight (lbs)"
                      onChangeText={onChange}
                      onBlur={onBlur}
                      value={String(value)}
                      placeholder="0"
                      maxLength={4}
                      style={tw.style('py-0 border-b-2', index === 0 ? 'rounded-t-xl' : undefined)}
                      textInputStyle={tw`pl-0 py-2.5 text-right web:text-base`}
                      labelStyle={tw`pl-10 web:text-base`}
                      selectTextOnFocus
                      keyboardType="numeric"
                      numeric
                      error={
                        errors &&
                        errors.platePairs &&
                        errors.platePairs[index] &&
                        errors?.platePairs[index]?.value
                          ? 'Invalid plate size'
                          : undefined
                      }
                      errorStyle={tw`top-0 mt-3.5`}
                    />
                  )}
                />
              </View>
            </Animated.View>
          ))}
          <Animated.View
            layout={Layout.duration(1000).springify().damping(6).mass(0.3).stiffness(50)}
          >
            <ButtonContainer
              style={tw``}
              onPress={() =>
                append({
                  value: 0,
                  unit: 'lbs'
                })
              }
            >
              <ThemedView
                style={tw.style(
                  'justify-start',
                  fields.length === 0 ? 'rounded-xl' : 'rounded-b-xl'
                )}
              >
                <SpecialText>
                  <AntDesign name="pluscircle" size={16} />
                </SpecialText>
                <SpecialText style={tw`px-3`}>Add Plate Pair</SpecialText>
              </ThemedView>
            </ButtonContainer>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  )
}
