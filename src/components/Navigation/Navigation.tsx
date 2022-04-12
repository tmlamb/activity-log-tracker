import { NavigationContainer } from '@react-navigation/native'
import React from 'react'
import Routes from './Routes'

export default function Navigation() {
  return (
    <NavigationContainer>
      <Routes />
    </NavigationContainer>
  )
}
