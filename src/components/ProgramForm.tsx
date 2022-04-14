import { useNavigation } from '@react-navigation/native'
import { Formik } from 'formik'
import React from 'react'
import { View } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { tw } from '../tailwind'
import { Program } from '../types'
import ButtonContainer from './ButtonContainer'
import HeaderRightContainer from './HeaderRightContainer'
import SimpleTextInput from './SimpleTextInput'
import { SpecialText } from './Typography'

// type EditProps = {
//   program: Program
//   changeHandler: (program: Program) => void
// }

type Props = {
  changeHandler: (program: Program) => void
  program?: Program
}

interface PropsFilled extends Props {
  program: Program
}

export default function ProgramForm({ changeHandler, program }: PropsFilled) {
  const navigation = useNavigation()

  return (
    <Formik
      initialValues={{ name: program.name || '' }}
      onSubmit={values => {
        changeHandler({
          name: values.name,
          icon: program.icon || 'test',
          entityId: program.entityId || uuidv4(),
          sessions: program.sessions || []
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
              maxLength={25}
            />
            {/* <SimpleSelectInput
              onChangeOption={handleChange('type')}
              onBlur={handleChange('type')}
              label="Type"
              options={[{ name: 'Workout Program', entityId: '0' }]}
              value={{ name: 'Workout Program', entityId: '0' }}
              disabled
            /> */}
          </View>
        </>
      )}
    </Formik>
  )
}

ProgramForm.defaultProps = {
  program: {}
}
