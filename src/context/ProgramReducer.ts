import { Activity, Program, Session } from '../types'

export default (
  state: { programs: Program[] },
  action:
    | {
        type: 'ADD_PROGRAM' | 'UPDATE_PROGRAM'
        payload: Program
      }
    | {
        type: 'DELETE_PROGRAM'
        payload: { programId: string }
      }
    | {
        type: 'RESET'
        payload: Program[]
      }
    | {
        type: 'ADD_SESSION'
        payload: {
          programId: string
          session: Session
        }
      }
    | {
        type: 'UPDATE_SESSION'
        payload: {
          programId: string
          session: Session
        }
      }
    | {
        type: 'DELETE_SESSION'
        payload: {
          programId: string
          sessionId: string
        }
      }
    | {
        type: 'ADD_ACTIVITY'
        payload: {
          programId: string
          sessionId: string
          activity: Activity
        }
      }
    | {
        type: 'UPDATE_ACTIVITY'
        payload: {
          programId: string
          sessionId: string
          activity: Activity
        }
      }
    | {
        type: 'DELETE_ACTIVITY'
        payload: {
          programId: string
          sessionId: string
          activityId: string
        }
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
        programs: state.programs.filter(program => program.programId !== action.payload.programId)
      }
    case 'UPDATE_PROGRAM':
      return {
        programs: state.programs.map(
          program =>
            (program.programId === action.payload.programId ? action.payload : undefined) || program
        )
      }
    case 'RESET':
      return {
        programs: [...action.payload]
      }
    case 'ADD_SESSION':
      return {
        programs: state.programs.map(
          program =>
            (program.programId === action.payload.programId
              ? { ...program, sessions: [...program.sessions, action.payload.session] }
              : undefined) || program
        )
      }
    case 'UPDATE_SESSION':
      return {
        programs: state.programs.map(
          program =>
            (program.programId === action.payload.programId
              ? {
                  ...program,
                  sessions: program.sessions.map(
                    session =>
                      (session.sessionId === action.payload.session.sessionId
                        ? action.payload.session
                        : undefined) || session
                  )
                }
              : undefined) || program
        )
      }
    case 'DELETE_SESSION':
      return {
        programs: state.programs.map(
          program =>
            (program.programId === action.payload.programId
              ? {
                  ...program,
                  sessions: program.sessions.filter(
                    session => session.sessionId !== action.payload.sessionId
                  )
                }
              : undefined) || program
        )
      }
    case 'ADD_ACTIVITY':
      return {
        programs: state.programs.map(
          program =>
            (program.programId === action.payload.programId
              ? {
                  ...program,
                  sessions: program.sessions.map(
                    session =>
                      (session.sessionId === action.payload.sessionId
                        ? {
                            ...session,
                            activities: [...session.activities, action.payload.activity]
                          }
                        : undefined) || session
                  )
                }
              : undefined) || program
        )
      }
    case 'UPDATE_ACTIVITY':
      return {
        programs: state.programs.map(
          program =>
            (program.programId === action.payload.programId
              ? {
                  ...program,
                  sessions: program.sessions.map(
                    session =>
                      (session.sessionId === action.payload.sessionId
                        ? {
                            ...session,
                            activities: session.activities.map(
                              activity =>
                                (activity.activityId === action.payload.activity.activityId
                                  ? action.payload.activity
                                  : undefined) || activity
                            )
                          }
                        : undefined) || session
                  )
                }
              : undefined) || program
        )
      }
    case 'DELETE_ACTIVITY':
      return {
        programs: state.programs.map(
          program =>
            (program.programId === action.payload.programId
              ? {
                  ...program,
                  sessions: program.sessions.map(
                    session =>
                      (session.sessionId === action.payload.sessionId
                        ? {
                            ...session,
                            activities: session.activities.filter(
                              activity => activity.activityId !== action.payload.activityId
                            )
                          }
                        : undefined) || session
                  )
                }
              : undefined) || program
        )
      }
    default:
      return state
  }
}
