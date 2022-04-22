import React from 'react'
import { Activity, Exercise, Program, Session, WorkoutSet } from '../types'

type Props = {
  program: Program
  session: Session
  activity: Activity
  workoutSet: WorkoutSet
  exercises: Exercise[]
}

// type SetCardProps = {
//   set: Partial<WorkoutSet>
//   activity: Activity
//   index: number
// }

// function SetCard({ set, activity, index }: SetCardProps) {
//   // console.log(set)
//   // console.log(index)
//   return (
//     <NavigationLink screen="SetDetailScreen" navigationParams={{ title: `Warm-up Set 1` }}>
//       <CardInfo
//         primaryText={`${set.type} Set ${index + 1}`}
//         secondaryText={set.type === 'Work' ? stringifyLoad(activity.load) : undefined}
//         specialText={
//           index === 0 && (set.type === 'Warm-up' || activity.warmupSets === 0) ? 'Start' : undefined
//         }
//         rightIcon={
//           <SecondaryText>
//             <AntDesign name="right" size={16} />
//           </SecondaryText>
//         }
//         textStyle={tw`web:text-base web:sm:text-lg `}
//         style={tw.style(
//           'border-b-2',
//           index === 0 && (set.type === 'Warm-up' || activity.warmupSets === 0)
//             ? 'rounded-t-xl'
//             : undefined,
//           index === activity.workSets - 1 && set.type === 'Work'
//             ? 'rounded-b-xl border-b-0 mb-9'
//             : undefined
//         )}
//       />
//     </NavigationLink>
//   )
// }

export default function WorkoutSetDetail({
  program,
  session,
  activity,
  workoutSet,
  exercises
}: Props) {
  // console.log(session)
  // This process creates the partial workout set data based on the planned activities,
  // and arranges it for the section list.
  //   const sections = Array.from(session.activities, ac => ({
  //     title: `${exercises.find(exercise => exercise.exerciseId === a.exerciseId)!.name}`,
  //     data: [
  //       ...(Array.from(Array(a.warmupSets)).map((item, index) => ({
  //         set: {
  //           type: 'Warm-up'
  //         },
  //         activity,
  //         index
  //       })) as SetCardProps[]),
  //       ...(Array.from(Array(a.workSets)).map((item, index) => ({
  //         set: {
  //           type: 'Work'
  //         },
  //         activity,
  //         index
  //       })) as SetCardProps[])
  //     ]
  //   }))

  // console.log('sections', sections)

  return (
    <>
      {/* <HeaderRightContainer>
      </HeaderRightContainer> */}

      {/* <CardInfo style={tw`rounded-t-xl`} primaryText="Exercise" secondaryText={} />

      <SimpleSectionList
        style={tw``}
        sections={sections}
        keyExtractor={(item, index) => `${index}`}
        renderItem={({ index, item, section }) => (
          <SetCard
            set={(item as SetCardProps).set}
            activity={(item as SetCardProps).activity}
            index={(item as SetCardProps).index}
          />
        )}
      /> */}
    </>
  )
}
