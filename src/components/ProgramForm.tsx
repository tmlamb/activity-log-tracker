import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { ScrollView } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import tw from '../tailwind'
import { Program } from '../types'
import { spaceReplace } from '../utils'
import CancelButton from './CancelButton'
import CardInfo from './CardInfo'
import DoubleConfirm from './DoubleConfirm'
import LinkButton from './LinkButton'
import SaveButton from './SaveButton'
import TextInput from './TextInput'
import { AlertText, SecondaryText } from './Typography'

type Props = {
  program?: Program
  changeHandler: (program: Program) => void
  deleteHandler?: (programId: string) => void
  goBack: () => void
}

export default function ProgramForm({ program, changeHandler, deleteHandler, goBack }: Props) {
  type FormData = Pick<Program, 'name'>
  const {
    control,
    handleSubmit,
    formState: { errors }
  } = useForm<FormData>({
    defaultValues: {
      name: program?.name
    }
  })

  const onSubmit = (data: FormData) => {
    changeHandler(
      program
        ? { ...program, name: spaceReplace(data.name) }
        : {
            name: spaceReplace(data.name),
            programId: uuidv4(),
            sessions: []
          }
    )
    goBack()
  }

  const isEdit = !!program

  return (
    <>
      <SaveButton onPress={handleSubmit(onSubmit)} />
      <CancelButton onPress={goBack} />
      <ScrollView style={tw`flex-grow py-9`}>
        <Controller
          name="name"
          control={control}
          rules={{
            required: true
          }}
          render={({ field: { onChange, ref, onBlur, value } }) => (
            <TextInput
              onChangeText={onChange}
              onBlur={onBlur}
              innerRef={ref}
              value={value}
              label="Program Name"
              maxLength={24}
              error={errors.name ? 'Program Name is required' : undefined}
            />
          )}
        />
        {!isEdit && (
          <SecondaryText style={tw`text-xs px-3 pt-1.5`}>
            {`Give your workout program a name, like 'Strength Training', 'Weightlifting', or 'Beach Bod 🏖️'`}
          </SecondaryText>
        )}
        {isEdit && deleteHandler && (
          <DoubleConfirm
            style={tw`mt-9`}
            first={<CardInfo style={tw``} alertText="Delete This Program" />}
            second={
              <LinkButton
                to={{ screen: 'DashboardScreen' }}
                beforeNavigation={() => deleteHandler(program.programId)}
              >
                <AlertText style={tw`px-3 py-3 -my-3`}>
                  <AntDesign name="minuscircle" size={15} />
                </AlertText>
              </LinkButton>
            }
          />
        )}
      </ScrollView>
    </>
  )
}

ProgramForm.defaultProps = {
  program: undefined,
  deleteHandler: undefined
}
