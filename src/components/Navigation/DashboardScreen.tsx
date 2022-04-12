import React from 'react'
import { useProgramState } from '../../context/ProgramState'
import { Dashboard } from '../Dashboard'
import ScreenLayout from './ScreenLayout'

// const mock: Program[] = [
//   {
//     name: 'Strength',
//     sessions: [
//       {
//         name: 'Chest',
//         entityId: '1',
//         start: new Date(),
//         end: undefined,
//         activities: [
//           {
//             entityId: '1',
//             warmupSets: 3,
//             workSets: 3,
//             reps: 5,
//             load: {
//               value: 77.5,
//               type: 'PERCENT'
//             },
//             rest: 3,
//             exercise: {
//               name: 'Squat',
//               entityId: '1',
//               muscle: 'Quadriceps',
//               oneRepMax: {
//                 value: 100,
//                 unit: 'lbs'
//               }
//             }
//           }
//         ]
//       }
//     ],
//     icon: 'test',
//     type: 'Workout Program',
//     entityId: '1'
//   }
// ]

function DashboardScreen() {
  const { programs } = useProgramState()
  return (
    <ScreenLayout>
      <Dashboard programs={programs} />
    </ScreenLayout>
  )
}

export default DashboardScreen
