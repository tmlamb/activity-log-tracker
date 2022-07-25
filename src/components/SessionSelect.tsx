import { AntDesign } from '@expo/vector-icons'
import _ from 'lodash'
import React from 'react'
import { View } from 'react-native'
import tw from '../tailwind'
import { Program, Session } from '../types'
import { formatWeekAndDayKey } from '../utils'
import ButtonContainer from './ButtonContainer'
import HeaderLeftContainer from './HeaderLeftContainer'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import { RootStackParamList } from './Navigation'
import SelectList from './SelectList'
import { PrimaryText, SecondaryText, SpecialText, ThemedView } from './Themed'

type Props = {
  session?: Session
  sessions?: Session[]
  program: Program
  parentScreen: keyof RootStackParamList
  parentParams: object
  modalSelectId: string
  goBack: () => void
}

export default function SessionSelect({
  session: initialValue,
  sessions,
  program,
  parentScreen,
  parentParams,
  modalSelectId,
  goBack
}: Props) {
  const [selected, setSelected] = React.useState<Partial<Session> | undefined>(initialValue)

  const sessionsSorted = _(sessions).filter('end').orderBy(['start'], ['desc']).value()

  const orderedByStart = _.orderBy(program.sessions, ['start'], ['asc'])
  const programStart = orderedByStart[0]?.start || new Date() // The first session is considered the program start

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
          disabled={!selected}
        >
          <SpecialText style={tw`font-bold`}>Done</SpecialText>
        </LinkButton>
      </HeaderRightContainer>
      <HeaderLeftContainer>
        <ButtonContainer onPress={goBack}>
          <SpecialText>Cancel</SpecialText>
        </ButtonContainer>
      </HeaderLeftContainer>
      {sessions && (
        <SelectList
          style={tw`flex-1`}
          contentContainerStyle={tw`px-3 pb-48 pt-9`}
          keyExtractor={(item, index) => `${item.name}.${index}`}
          items={sessionsSorted}
          onSelect={item => {
            if (item) {
              setSelected({
                ...item,
                start: undefined,
                end: undefined,
                activities: item?.activities?.map(actvy => ({
                  ...actvy,
                  warmupSets: actvy.warmupSets?.map(ws => ({
                    ...ws,
                    start: undefined,
                    end: undefined
                  })),
                  mainSets: actvy.mainSets?.map(ms => ({
                    ...ms,
                    start: undefined,
                    end: undefined
                  }))
                }))
              })
            }
          }}
          renderItem={({ item, index }) => (
            <ThemedView
              style={tw.style(
                'border-b-2',
                index === 0 ? 'rounded-t-xl' : undefined,
                index === sessions.length - 1 ? 'border-b-0 rounded-b-xl' : undefined
              )}
            >
              <PrimaryText>{item.name}</PrimaryText>
              <View style={tw`relative flex-row`}>
                <SecondaryText style={tw`pr-6`}>
                  {formatWeekAndDayKey(programStart, item.start || new Date())}
                </SecondaryText>
                <SpecialText style={tw`absolute -right-1`}>
                  {item.sessionId === selected?.sessionId && <AntDesign name="check" size={22} />}
                </SpecialText>
              </View>
            </ThemedView>
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
