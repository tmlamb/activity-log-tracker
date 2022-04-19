import { useNavigation } from '@react-navigation/native'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { LogBox, View } from 'react-native'
import { tw } from '../tailwind'
import { Load } from '../types'
import SimplePicker from './ActivitiesInput/SimplePicker'
import ButtonContainer from './ButtonContainer'
import HeaderRightContainer from './HeaderRightContainer'
import { ActivityNavigationProp } from './Navigation/ActivityDetailScreen'
import { LoadFormNavigationProp } from './Navigation/LoadFormModal'
import { ProgramNavigationProp } from './Navigation/ProgramDetailScreen'
import { ProgramFormNavigationProp } from './Navigation/ProgramFormModal'
import { SessionNavigationProp } from './Navigation/SessionDetailScreen'
import { SessionFormNavigationProp } from './Navigation/SessionFormModal'
import SimpleTextInput from './SimpleTextInput'
import { primaryTextColor, SpecialText } from './Typography'

// TODO: Address problem with non-serializable navigation prop (see onSelect function), then remove this ignore statement
LogBox.ignoreLogs(['Non-serializable values were found in the navigation state'])

type Props = {
  load?: Load
  onSelect: (load: Load) => void
}

type FormData = {
  type: 'RPE' | 'PERCENT'
  value: number
}

export default function LoadForm({ load, onSelect }: Props) {
  const navigation = useNavigation<
    | ProgramNavigationProp
    | SessionNavigationProp
    | ActivityNavigationProp
    | ProgramFormNavigationProp
    | SessionFormNavigationProp
    | LoadFormNavigationProp
  >()
  const {
    control,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      type: load && load.type,
      value: load && load.value
    }
  })
  const type = watch('type')
  //   const [state, setState] = useState<Partial<Load>>(load || {})
  //   const handleSubmit = () => {
  //     onSelect({ type: state.type!, value: state.value! })
  //     navigation.goBack()
  //   }
  const onSubmit = (data: FormData) => {
    onSelect({ type: data.type, value: data.value })
    navigation.goBack()
  }

  return (
    <>
      <HeaderRightContainer>
        <ButtonContainer onPress={handleSubmit(onSubmit)}>
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
            <SimplePicker
              label="Load Type"
              items={[
                { label: 'RPE', value: 'RPE', color: tw.style(primaryTextColor).color as string },
                {
                  label: 'Percent',
                  value: 'PERCENT',
                  color: tw.style(primaryTextColor).color as string
                }
              ]}
              //   onValueChange={(value: string) =>
              //     setState({ ...load, type: value === 'PERCENT' ? 'PERCENT' : 'RPE' })
              //   }
              onValueChange={onChange}
              value={value}
              style={tw`px-4 mb-9`}
            />
          )}
          name="type"
        />
        {type === 'RPE' && (
          <Controller
            control={control}
            rules={{
              required: true
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <SimpleTextInput
                label="RPE Value"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value.toString()}
                placeholder="0"
                maxLength={2}
                textAlign="right"
                style={tw`px-4 py-0`}
                textInputStyle={tw`px-0 py-2.5`}
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
              required: true
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <SimpleTextInput
                label="% of 1RM"
                onChangeText={onChange}
                onBlur={onBlur}
                value={value.toString()}
                placeholder="0"
                maxLength={4}
                textAlign="right"
                style={tw`px-1 py-0`}
                textInputStyle={tw`px-4 py-3`}
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
