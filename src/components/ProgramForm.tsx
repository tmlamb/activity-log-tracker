import { useNavigation } from '@react-navigation/native'
import { Formik } from 'formik'
import React from 'react'
import { View } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { tw } from '../tailwind'
import { Program } from '../types'
import ButtonContainer from './ButtonContainer'
import CardInfo from './CardInfo'
import HeaderRightContainer from './HeaderRightContainer'
import NavigationLink from './Navigation/NavigationLink'
import SimpleTextInput from './SimpleTextInput'
import { SpecialText } from './Typography'

type Props = {
  changeHandler: (program: Program) => void
  program?: Program
  deleteHandler?: (entityId: string) => void
}

export default function ProgramForm({ changeHandler, program, deleteHandler }: Props) {
  const navigation = useNavigation()
  return (
    <Formik
      initialValues={{ name: (program && program.name) || '' }}
      onSubmit={values => {
        changeHandler(
          program
            ? { ...program, name: values.name }
            : {
                name: values.name,
                icon: 'test',
                programId: uuidv4(),
                sessions: []
              }
        )
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
            {program && deleteHandler && (
              <NavigationLink
                navigationParams={{ programId: program.programId }}
                screen="DashboardScreen"
                callback={() => deleteHandler(program.programId)}
              >
                <CardInfo style={tw``} alertText="Delete This Program" />
              </NavigationLink>
            )}
          </View>
        </>
      )}
    </Formik>
  )
}

ProgramForm.defaultProps = {
  program: undefined,
  deleteHandler: undefined
}
