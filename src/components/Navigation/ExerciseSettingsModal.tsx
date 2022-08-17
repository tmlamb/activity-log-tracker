import React from 'react'
import useExerciseStore from '../../hooks/use-exercise-store'
import useWorkoutStore from '../../hooks/use-workout-store'
import ButtonContainer from '../ButtonContainer'
import ExerciseSettings from '../ExerciseSettings'
import HeaderLeftContainer from '../HeaderLeftContainer'
import { SpecialText } from '../Themed'
import ModalLayout from './ModalLayout'
import { RootStackScreenProps } from './types'

function ExerciseSettingsModal({
  navigation: { goBack }
}: RootStackScreenProps<'ExerciseSettingsModal'>) {
  const availableExercises = useExerciseStore(state => state.exercises)
  const usedExercises = useWorkoutStore(state => state.exercises)

  return (
    <ModalLayout>
      <HeaderLeftContainer>
        <ButtonContainer onPress={goBack}>
          <SpecialText>Close</SpecialText>
        </ButtonContainer>
      </HeaderLeftContainer>
      <ExerciseSettings
        availableExercises={availableExercises}
        usedExercises={usedExercises}
        goBack={goBack}
      />
    </ModalLayout>
  )
}

export default ExerciseSettingsModal
