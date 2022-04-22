import { Activity, Exercise, Program, Session, WorkoutSet } from '../types'

export default (
  state: { programs: Program[]; exercises: Exercise[] },
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
        payload: { programs: Program[]; exercises: Exercise[] }
      }
    | {
        type: 'ADD_SESSION' | 'UPDATE_SESSION'
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
        type: 'ADD_ACTIVITY' | 'UPDATE_ACTIVITY'
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
        type: 'ADD_EXERCISE' | 'UPDATE_EXERCISE'
        payload: Exercise
      }
    | {
        type: 'ADD_WORKOUT_SET' | 'UPDATE_WORKOUT_SET'
        payload: {
          programId: string
          sessionId: string
          activityId: string
          workoutSet: WorkoutSet
        }
      }
    | {
        type: 'DELETE_WORKOUT_SET'
        payload: {
          programId: string
          sessionId: string
          activityId: string
          workoutSetId: string
        }
      }
    | {
        type: undefined
      }
) => {
  // console.log('action', action)
  // console.log('state', state)
  switch (action.type) {
    case 'ADD_PROGRAM':
      return {
        programs: [action.payload, ...state.programs],
        exercises: state.exercises
      }
    case 'DELETE_PROGRAM':
      return {
        programs: state.programs.filter(program => program.programId !== action.payload.programId),
        exercises: state.exercises
      }
    case 'UPDATE_PROGRAM':
      return {
        programs: state.programs.map(
          program =>
            (program.programId === action.payload.programId ? action.payload : undefined) || program
        ),
        exercises: state.exercises
      }
    case 'RESET':
      return {
        programs: [...action.payload.programs],
        exercises: [...action.payload.exercises]
      }
    case 'ADD_SESSION':
      // console.log('num activities saved', action.payload.session.activities.length)
      return {
        programs: state.programs.map(
          program =>
            (program.programId === action.payload.programId
              ? { ...program, sessions: [...program.sessions, action.payload.session] }
              : undefined) || program
        ),
        exercises: state.exercises
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
        ),
        exercises: state.exercises
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
        ),
        exercises: state.exercises
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
        ),
        exercises: state.exercises
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
        ),
        exercises: state.exercises
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
        ),
        exercises: state.exercises
      }
    case 'ADD_EXERCISE':
      return {
        exercises: [action.payload, ...state.exercises],
        programs: state.programs
      }
    case 'UPDATE_EXERCISE':
      return {
        exercises: state.exercises.map(
          exercise =>
            (exercise.exerciseId === action.payload.exerciseId ? action.payload : undefined) ||
            exercise
        ),
        programs: state.programs
      }
    case 'ADD_WORKOUT_SET':
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
                                (activity.activityId === action.payload.activityId
                                  ? {
                                      ...activity,
                                      workoutSets: [
                                        ...activity.workoutSets,
                                        action.payload.workoutSet
                                      ]
                                    }
                                  : undefined) || activity
                            )
                          }
                        : undefined) || session
                  )
                }
              : undefined) || program
        ),
        exercises: state.exercises
      }
    case 'UPDATE_WORKOUT_SET': {
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
                                (activity.activityId === action.payload.activityId
                                  ? {
                                      ...activity,
                                      workoutSets: activity.workoutSets.map(
                                        workoutSet =>
                                          (workoutSet.workoutSetId ===
                                          action.payload.workoutSet.workoutSetId
                                            ? action.payload.workoutSet
                                            : undefined) || workoutSet
                                      )
                                    }
                                  : undefined) || activity
                            )
                          }
                        : undefined) || session
                  )
                }
              : undefined) || program
        ),
        exercises: state.exercises
      }
    }
    case 'DELETE_WORKOUT_SET': {
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
                                (activity.activityId === action.payload.activityId
                                  ? {
                                      ...activity,
                                      workoutSets: activity.workoutSets.filter(
                                        workoutSet =>
                                          workoutSet.workoutSetId !== action.payload.workoutSetId
                                      )
                                    }
                                  : undefined) || activity
                            )
                          }
                        : undefined) || session
                  )
                }
              : undefined) || program
        ),
        exercises: state.exercises
      }
    }
    default:
      return state
  }
}
