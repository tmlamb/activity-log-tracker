import { AntDesign } from '@expo/vector-icons'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import React from 'react'
import { Text } from 'react-native'
import { StackParamList } from '../../types'
import ActivityDetailScreen from './ActivityDetailScreen'
import DashboardScreen from './DashboardScreen'
import NavigationLink from './NavigationLink'
import ProgramDetailScreen from './ProgramDetailScreen'
import ProgramFormModal from './ProgramFormModal'
import SessionDetailScreen from './SessionDetailScreen'

const AppStack = createNativeStackNavigator<StackParamList>()

export default function Navigation() {
  return (
    <NavigationContainer>
      <AppStack.Navigator initialRouteName="DashboardScreen">
        <AppStack.Screen
          name="DashboardScreen"
          component={DashboardScreen}
          options={{
            // eslint-disable-next-line react/no-unstable-nested-components
            headerRight: () => (
              <NavigationLink screen="ProgramFormModal" id="">
                <Text>
                  <AntDesign name="plus" size={24} color="blue" />
                </Text>
              </NavigationLink>
            ),
            title: ''
          }}
        />
        <AppStack.Screen name="ProgramDetailScreen" component={ProgramDetailScreen} />
        <AppStack.Screen name="SessionDetailScreen" component={SessionDetailScreen} />
        <AppStack.Screen name="ActivityDetailScreen" component={ActivityDetailScreen} />
        <AppStack.Group screenOptions={{ presentation: 'modal' }}>
          <AppStack.Screen
            name="ProgramFormModal"
            component={ProgramFormModal}
            options={({ route }) => ({
              title: 'Add Program'
            })}
          />
        </AppStack.Group>
      </AppStack.Navigator>
    </NavigationContainer>
  )
}
