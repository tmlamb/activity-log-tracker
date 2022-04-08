import { Program } from '../types'

export default (
  state: { programs: Program[] },
  action:
    | {
        type: 'ADD_PROGRAM' | 'UPDATE_PROGRAM'
        payload: Program
      }
    | {
        type: 'DELETE_PROGRAM'
        payload: { id: string }
      }
    | {
        type: 'RESET'
        payload: Program[]
      }
    | {
        type: undefined
      }
) => {
  switch (action.type) {
    case 'ADD_PROGRAM':
      return {
        programs: [action.payload, ...state.programs]
      }
    case 'DELETE_PROGRAM':
      return {
        programs: state.programs.filter(program => program.id !== action.payload.id)
      }
    case 'UPDATE_PROGRAM':
      return {
        programs: state.programs.map(
          program => (program.id === action.payload.id ? action.payload : undefined) || program
        )
      }
    case 'RESET':
      return {
        programs: [...action.payload]
      }
    default:
      return state
  }
}
