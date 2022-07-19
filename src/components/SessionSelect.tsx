import { AntDesign } from '@expo/vector-icons'
import { useNavigation } from '@react-navigation/native'
import React from 'react'
import tw from '../tailwind'
import { Program, Session } from '../types'
import { formatShortDateByProgramWeek } from '../utils'
import ButtonContainer from './ButtonContainer'
import CardInfo from './CardInfo'
import HeaderLeftContainer from './HeaderLeftContainer'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import { RootStackParamList } from './Navigation'
import SelectList from './SelectList'
import { SecondaryText, SpecialText } from './Typography'

type Props = {
  session?: Session
  sessions?: Session[]
  program: Program
  parentScreen: keyof RootStackParamList
  parentParams: object
  modalSelectId: string
}

export default function SessionSelect({
  session: initialValue,
  sessions,
  program,
  parentScreen,
  parentParams,
  modalSelectId
}: Props) {
  const navigation = useNavigation()
  // TODO: remove 'React.' everywhere
  const [selected, setSelected] = React.useState(initialValue)

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
          style={tw`px-4 py-4 -my-4 -mr-4`}
          disabled={!selected}
        >
          <SpecialText style={tw`font-bold`}>Done</SpecialText>
        </LinkButton>
      </HeaderRightContainer>
      <HeaderLeftContainer>
        <ButtonContainer
          style={tw`px-4 py-4 -my-4 -ml-4`}
          onPress={() => {
            navigation.goBack()
          }}
        >
          <SpecialText>Cancel</SpecialText>
        </ButtonContainer>
      </HeaderLeftContainer>
      {sessions && (
        <SelectList
          style={tw`flex-grow px-3 pt-9`}
          keyExtractor={(item, index) => `${(item as Session).name}.${index}`}
          items={sessions}
          onSelect={item => {
            setSelected(item as Session)
          }}
          renderItem={({ item, index }) => (
            <CardInfo
              rightIcon={
                <SpecialText style={tw``}>
                  {(item as Session).sessionId === selected?.sessionId && (
                    <AntDesign name="check" size={22} />
                  )}
                </SpecialText>
              }
              primaryText={(item as Session).name}
              secondaryText={formatShortDateByProgramWeek(
                (item as Session).start || new Date(),
                program
              )}
              textStyle={tw`mr-2`}
              style={tw.style(
                'border-b-2',
                index === 0 ? 'rounded-t-xl' : undefined,
                index === sessions.length - 1 ? 'border-b-0 rounded-b-xl mb-6' : undefined
              )}
            />
          )}
          ListHeaderComponent={
            sessions.length ? (
              <SecondaryText style={tw`pl-3 pt-1.5 pb-1.5 text-xs`}>
                Select a previous session to use as a template.
              </SecondaryText>
            ) : (
              <SecondaryText style={tw`pl-3 pt-1.5 pb-1.5 text-xs`}>
                No previous sessions in current program.
              </SecondaryText>
            )
          }
        />
      )}
    </>
  )
}

SessionSelect.defaultProps = {
  session: undefined,
  sessions: undefined
}
