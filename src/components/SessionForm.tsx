import { useNavigation } from '@react-navigation/native'
import { Formik } from 'formik'
import React from 'react'
import { View } from 'react-native'
import 'react-native-get-random-values'
import { v4 as uuidv4 } from 'uuid'
import { tw } from '../tailwind'
import { Session } from '../types'
import ButtonContainer from './ButtonContainer'
import HeaderRightContainer from './HeaderRightContainer'
import InfoCard from './InfoCard'
import NavigationLink from './Navigation/NavigationLink'
import SimpleTextInput from './SimpleTextInput'
import { SpecialText } from './Typography'

type Props = {
  changeHandler: (programId: string, session: Session) => void
  programId: string
  session?: Session
  deleteHandler?: (programId: string, sessionId: string) => void
}

export default function SessionForm({ changeHandler, programId, session, deleteHandler }: Props) {
  const navigation = useNavigation()
  return (
    <Formik
      initialValues={{ name: (session && session.name) || '' }}
      onSubmit={values => {
        changeHandler(
          programId,
          session
            ? { ...session, name: values.name }
            : {
                name: values.name,
                sessionId: uuidv4(),
                activities: [],
                start: new Date(),
                end: undefined
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
              placeholder="Session Name"
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
            {session && deleteHandler && (
              <NavigationLink
                navigationParams={{ programId, sessionId: session.sessionId }}
                screen="ProgramDetailScreen"
                callback={() => deleteHandler(programId, session.sessionId)}
              >
                <InfoCard
                  style={tw``}
                  // primaryText={item.name}
                  alertText="Delete This Session"
                  // rightIcon={
                  //   <SecondaryText>
                  //     <AntDesign name="right" size={16} />
                  //   </SecondaryText>
                  // }
                />
              </NavigationLink>
            )}
          </View>
        </>
      )}
    </Formik>
  )
}

SessionForm.defaultProps = {
  session: undefined,
  deleteHandler: undefined
}
