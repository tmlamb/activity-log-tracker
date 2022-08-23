import React from 'react'
import renderer, { act, ReactTestRendererJSON } from 'react-test-renderer'
import App from './App'

describe('<App />', () => {
  it('App root renders with children', async () => {
    const tree = renderer.create(<App />).toJSON() as ReactTestRendererJSON
    await act(async () => {
      expect(tree?.children?.length).toBe(1)
    })
  })
})
