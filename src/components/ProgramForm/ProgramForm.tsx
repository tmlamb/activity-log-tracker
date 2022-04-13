import { useNavigation } from '@react-navigation/native'
import { Formik } from 'formik'
import React from 'react'
import { View } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { tw } from '../../tailwind'
import { Program } from '../../types'
import { ButtonContainer } from '../ButtonContainer'
import { HeaderRightContainer } from '../HeaderRightContainer'
import SimpleSelectInput from '../SimpleSelectInput/SimpleSelectInput'
import { SimpleTextInput } from '../SimpleTextInput'
import { SpecialText } from '../Typography'

type Props = {
  addProgramHandler: (program: Program) => void
}

export default function ProgramForm({ addProgramHandler }: Props) {
  const navigation = useNavigation()
  return (
    <Formik
      initialValues={{ name: '', type: 'Workout Program' }}
      onSubmit={values => {
        addProgramHandler({
          name: values.name,
          type: 'Workout Program',
          icon: 'test',
          entityId: uuidv4(),
          sessions: []
        })
        navigation.goBack()
      }}
    >
      {({ handleSubmit, handleChange, handleBlur, values }) => (
        <>
          <HeaderRightContainer>
            <ButtonContainer onPress={handleSubmit as (values: unknown) => void}>
              <SpecialText style={tw`font-bold`}>Save</SpecialText>
            </ButtonContainer>
          </HeaderRightContainer>
          <View style={tw`flex flex-col`}>
            <SimpleTextInput
              onChangeText={handleChange('name')}
              onBlur={handleBlur('name')}
              value={values.name}
              placeholder="Program Name"
              maxLength={20}
            />
            <SimpleSelectInput
              name="Program Type"
              options={[{ name: 'Workout Program', entityId: '0' }]}
              defaultIndex={0}
              disabled
            />

            {/* <TextInput onChangeText={handleChange('type')} editable={false} value={values.type} /> */}
          </View>
        </>
      )}
    </Formik>
  )
}
