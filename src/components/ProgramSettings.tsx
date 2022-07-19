import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { FlatList } from 'react-native'
import tw from '../tailwind'
import { Program } from '../types'
import CardInfo from './CardInfo'
import HeaderRightContainer from './HeaderRightContainer'
import LinkButton from './LinkButton'
import { SecondaryText, SpecialText } from './Typography'

type Props = {
  programs: Program[]
}

export default function ProgramSettings({ programs }: Props) {
  return (
    <>
      <HeaderRightContainer>
        <LinkButton to={{ screen: 'ProgramFormModal' }} style={tw`py-6 pl-8 pr-3 -my-6 -mr-4`}>
          <SpecialText>
            <AntDesign name="plus" size={28} />
          </SpecialText>
        </LinkButton>
      </HeaderRightContainer>
      <FlatList
        // keyExtractor={program => (program as Program).programId}
        style={tw`flex-grow px-3 py-9`}
        contentContainerStyle={tw`pb-48`}
        data={programs}
        // sections={[{ title: 'Workout Programs', data: programs }]}
        // ListHeaderComponent={
        // }
        // ListFooterComponent={
        //   <>
        //     {programs.length < 1 && (
        //       <>
        //         <LinkButton to={{ screen: 'ProgramFormModal' }} style={tw``}>
        //           <CardInfo
        //             style={tw.style('rounded-xl')}
        //             specialText="Create Workout Program"
        //             reverse
        //           />
        //         </LinkButton>
        //         <SecondaryText style={tw`pt-1.5 pl-3 text-xs`}>
        //           Add a new program to start planning workouts.
        //         </SecondaryText>
        //       </>
        //     )}
        //     {programs.length > 0 &&
        //       programs.reduce((total, program) => total + program.sessions.length, 0) < 4 && (
        //         <SecondaryText style={tw`pl-3 pt-1.5 text-xs`}>
        //           Select a program to start planning workout sessions.
        //         </SecondaryText>
        //       )}
        //   </>
        // }
        // renderSectionHeader={({ section: { title, data } }) => (
        //   <SecondaryText style={tw`pl-3 pb-1.5 uppercase text-sm`}>
        //     {data.length ? title : undefined}
        //   </SecondaryText>
        // )}
        renderItem={({ index, item }) => (
          <LinkButton
            to={{
              screen: 'ProgramFormModal',
              params: { programId: item.programId }
            }}
          >
            <CardInfo
              style={tw.style(
                'border-b-2',
                index === 0 ? 'rounded-t-xl' : undefined,
                index === programs.length - 1 ? 'rounded-b-xl border-b-0' : undefined
              )}
              primaryText={item.name}
              secondaryText={`${item.sessions.length} session${
                item.sessions.length !== 1 ? 's' : ''
              }`}
              rightIcon={
                <SecondaryText>
                  <AntDesign name="right" size={16} />
                </SecondaryText>
              }
            />
          </LinkButton>
        )}
      />
    </>
  )
}
