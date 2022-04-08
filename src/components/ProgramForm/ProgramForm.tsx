import { Formik } from 'formik'
import React from 'react'
import { Text, TextInput } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { tw } from '../../tailwind'
import { Program } from '../../types'
import { ButtonContainer } from '../ButtonContainer'
import { HeaderRight } from '../HeaderRight'

type Props = {
  handler: (program: Program) => void
}

export default function ProgramForm({ handler }: Props) {
  return (
    <Formik
      initialValues={{ name: '', type: 'Workout Program' }}
      onSubmit={values => {
        handler({
          name: values.name,
          type: 'Workout Program',
          icon: 'test',
          id: uuidv4(),
          sessions: []
        })
      }}
    >
      {({ handleSubmit, handleChange, handleBlur, values }) => (
        <>
          <HeaderRight>
            <ButtonContainer onPress={handleSubmit as (values: unknown) => void}>
              <Text style={tw`text-xl font-bold text-blue-500`}>Save</Text>
            </ButtonContainer>
          </HeaderRight>
          <TextInput
            onChangeText={handleChange('name')}
            onBlur={handleBlur('name')}
            value={values.name}
          />
          <TextInput onChangeText={handleChange('type')} editable={false} value={values.type} />
        </>
      )}
    </Formik>
  )
}
