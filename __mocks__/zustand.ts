import { act } from 'react-test-renderer'
import { StateCreator } from 'zustand'
import { WorkoutStore } from '../src/hooks/use-workout-store'

const actualCreate = jest.requireActual('zustand')

// Functions to reset state, to be called after each test
const storeResetFns = new Set<() => void>()

// Mock of zustand's create function
const create = () => (createState: StateCreator<WorkoutStore>) => {
  const store = actualCreate.default(createState)
  const initialState = store.getState()
  storeResetFns.add(() => {
    store.setState(initialState, true)
  })
  return store
}

// Reset all stores after each test run
beforeEach(async () => {
  await act(() =>
    storeResetFns.forEach(resetFn => {
      resetFn()
    })
  )
})

export default create
