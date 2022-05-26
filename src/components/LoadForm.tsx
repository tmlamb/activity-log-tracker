import { useNavigation } from '@react-navigation/native'
import React, { useEffect } from 'react'
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
    formState: { errors, isValid },
    setValue
  } = useForm<Partial<Load>>({
    defaultValues: {
      type: load && load.type,
      value: load && load.value
    }
  })
  const type = watch('type')

  const onSubmit = (data: Partial<Load>) => {
    // console.log('submitted!')
    // console.log(data)
    onSelect({ type: data.type!, value: data.value || 0 })
    navigation.goBack()
  }

  useEffect(() => {
    // console.log('errors', errors)
    // console.log('isValid', isValid)
  }, [errors, isValid])

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
              min: 0.1,
              max: 1
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="% of 1RM"
                onChangeText={v => {
                  console.log(v)
                  console.log((Number(v) / 100).toFixed(2))
                  const newVal = Number(v) / 100
                  if (Number.isNaN(newVal)) {
                    return
                  }
                  onChange(newVal.toFixed(2))
                }}
                onBlur={onBlur}
                value={(value && String(+(value * 100).toFixed(2))) || undefined}
                placeholder="0"
                maxLength={4}
                style={tw`px-0 py-0`}
                textInputStyle={tw`px-3 py-2.5 text-right web:w-1/4`}
                keyboardType="numeric"
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
