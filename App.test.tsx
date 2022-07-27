import React from 'react'
import renderer, { act, ReactTestRendererJSON } from 'react-test-renderer'
import App from './App'

describe('<App />', () => {
  it('has 1 child', async () => {
    const tree = renderer.create(<App />).toJSON() as ReactTestRendererJSON
    await act(async () => {
      expect(tree?.children?.length).toBe(1)
    })
  })
})
