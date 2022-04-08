import React from 'react'
import { View } from 'react-native'
import { useProgramState } from '../../context/ProgramState'
import { ProgramForm } from '../ProgramForm'

export default function ProgramFormModal() {
  const { addProgram } = useProgramState()

  return (
    <View>
      <ProgramForm handler={addProgram} />
    </View>
  )
}
