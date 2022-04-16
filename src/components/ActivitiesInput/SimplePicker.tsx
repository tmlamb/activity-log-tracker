import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { View } from 'react-native'
import RNPickerSelect from 'react-native-picker-select'
import { tw } from '../../tailwind'
import { SecondaryText } from '../Typography'

export default function SimplePicker() {
  return (
    <View style={tw`p-2`}>
      <RNPickerSelect
        placeholder={{
          label: 'Warmup Sets',
          value: 3,
          color: '#9EA0A4'
        }}
        style={{
          inputAndroid: {
            backgroundColor: 'transparent'
          },
          inputWeb: {
            backgroundColor: 'transparent',
            borderColor: 'transparent'
          },
          inputIOS: {
            backgroundColor: 'transparent',
            borderColor: 'transparent'
          },
          inputAndroidContainer: {},
          inputIOSContainer: {},
          iconContainer: {
            // top: 5,
            // right: 15
          }
        }}
        onValueChange={value => console.log(value)}
        items={[
          { label: '1', value: '1' },
          { label: '2', value: '2' },
          { label: '3', value: '3' },
          { label: '4', value: '4' },
          { label: '5', value: '5' },
          { label: '6', value: '6' },
          { label: '7', value: '7' },
          { label: '8', value: '8' },
          { label: '9', value: '9' },
          { label: '10', value: '10' }
        ]}
        // eslint-disable-next-line react/no-unstable-nested-components
        Icon={() => (
          <SecondaryText>
            <AntDesign name="right" size={16} />
          </SecondaryText>
        )}
      />
    </View>
  )
}
