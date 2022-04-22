import { Exercise } from '../types'

export default (
  // Exercises available in the CSV file will not have all fields, such as exerciseId.
  // Exercise will only be made "concrete" when associated with data in the Workout Program state.
  state: { exercises: Partial<Exercise>[] },
  action:
    | {
        type: 'RESET'
        payload: Partial<Exercise>[]
      }
    | {
        type: 'ADD_EXERCISE'
        payload: Partial<Exercise>
      }
    | {
        type: undefined
      }
) => {
  switch (action.type) {
    case 'ADD_EXERCISE':
      return {
        exercises: [action.payload, ...state.exercises]
      }
    case 'RESET':
      return {
        exercises: [...action.payload]
      }
    default:
      return state
  }
}
