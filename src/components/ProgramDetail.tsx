import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { View } from 'react-native'
import { tw } from '../tailwind'
import { Program } from '../types'
import { mapSessionsByDate } from '../utils'
import Card from './Card'
import HeaderRightContainer from './HeaderRightContainer'
import NavigationLink from './Navigation/NavigationLink'
import SimpleSectionList from './SimpleSectionList'
import { SecondaryText, SpecialText } from './Typography'

type Props = {
  program: Program
}

export default function ProgramDetail({ program }: Props) {
  const sessions = mapSessionsByDate(program.sessions)
  console.log(sessions)
  if (!sessions.has(new Date().toLocaleDateString())) {
    sessions.set('Today', [])
  }
  console.log(sessions)
  const sections = Array.from(sessions, ([title, data]) => ({
    title,
    data
  }))

  console.log(sections)

  return (
    <>
      {/* <Card style={tw`rounded-lg`} label="Name" value={program.name} />
      <FlatList
        data={program.sessions}
        renderItem={({ item }) => (
          <NavigationLink entityId={item.entityId} screen="SessionDetailScreen">
            <Text>{item.name}</Text>
          </NavigationLink>
        )}
      /> */}
      <HeaderRightContainer>
        <NavigationLink screen="ProgramFormModal" entityId={program.entityId} name="Edit Program">
          <SpecialText>
            <AntDesign name="plus" size={28} />
            {/* <SpecialText>Edit</SpecialText> */}
          </SpecialText>
        </NavigationLink>
      </HeaderRightContainer>

      <View style={tw`flex flex-col`}>
        <Card style={tw`rounded-lg mb-9`} label="Name" value={program.name} disabled />
        {program.sessions.length > 0 && (
          <SimpleSectionList
            style={tw`pb-1.5`}
            sections={Array.from(mapSessionsByDate(program.sessions), ([title, data]) => ({
              title,
              data
            }))}
            renderItem={({ index, item, section }) => (
              <NavigationLink entityId={item.entityId} screen="SessionDetailScreen">
                <Card
                  style={tw.style(
                    'border-b-2 dark:border-slate-800 border-slate-300',
                    index === 0 ? 'rounded-t-xl' : undefined,
                    index === section.data.length - 1 ? 'rounded-b-xl border-b-0' : undefined
                  )}
                  label={item.name}
                />
              </NavigationLink>
            )}
          />
        )}
        {program.sessions.length < 1 && (
          <SecondaryText style={tw`pl-4 text-xs`}>
            Start tracking workouts by planning a session.
          </SecondaryText>
        )}
      </View>
    </>
  )
}
