import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { Platform, View } from 'react-native'
import RNPickerSelect, { Item as RNPickerSelectItem } from 'react-native-picker-select'
import Animated, { SlideInRight, SlideOutRight } from 'react-native-reanimated'
import { ClassInput } from 'twrnc/dist/esm/types'
import tw from '../tailwind'
import Card from './Card'
import { AlertText, PrimaryText, SecondaryText, secondaryTextColor } from './Typography'

type Props = {
  label: string
  items: RNPickerSelectItem[]
  style?: ClassInput
  onValueChange?: (value: string) => void
  value?: string
  innerRef?: React.LegacyRef<RNPickerSelect>
  error?: string
  errorStyle?: ClassInput
}

interface PropsFilled extends Props {
  onValueChange: (value: string) => void
}

export default function Picker({
  label,
  items,
  style,
  onValueChange,
  value,
  innerRef,
  error,
  errorStyle
}: PropsFilled) {
  return (
    <Card
      style={tw.style(
        'relative py-2.5 web:p-0 web:flex-row web:justify-between web:items-center',
        style,
        {
          cursor: 'pointer'
        }
      )}
    >
      <PrimaryText style={tw`absolute pt-2 pl-4 web:relative web:w-1/3 web:pl-0`}>
        {label}
      </PrimaryText>
      <View>
        <RNPickerSelect
          placeholder={{ inputLabel: 'Select', key: -1 }}
          pickerProps={{}}
          ref={innerRef}
          style={{
            inputAndroid: {
              backgroundColor: 'transparent',
              borderColor: 'transparent',
              alignItems: 'center',
              fontSize: 18,
              paddingRight: 7,
              color: tw.style(secondaryTextColor).color as string
            },
            inputWeb: {
              backgroundColor: 'transparent',
              borderColor: 'transparent',
              fontSize: 18,
              textAlign: 'right',
              color: tw.style(secondaryTextColor).color as string
            },
            inputIOS: {
              backgroundColor: 'transparent',
              borderColor: 'transparent',
              alignItems: 'center',
              fontSize: 18,
              paddingRight: 7,
              color: tw.style(secondaryTextColor).color as string
            },
            inputAndroidContainer: {},
            inputIOSContainer: {
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'flex-end'
            },
            iconContainer: {
              position: 'relative'
            },
            placeholder: {
              color: tw.style(secondaryTextColor).color as string
            },
            modalViewMiddle: {
              backgroundColor: tw.style('dark:bg-slate-900 bg-slate-200').backgroundColor as string
            },
            modalViewBottom: {
              backgroundColor: tw.style('dark:bg-black bg-white').backgroundColor as string
            }
          }}
          onValueChange={v => {
            onValueChange(v)
          }}
          modalProps={{
            style: {
              backgroundColor: 'black'
            }
          }}
          value={value}
          items={items}
          // eslint-disable-next-line react/no-unstable-nested-components
          Icon={() =>
            Platform.OS !== 'web' && (
              <SecondaryText style={tw`-my-0.5`}>
                <AntDesign name="right" size={16} />
              </SecondaryText>
            )
          }
        />
      </View>
      <Animated.View
        entering={SlideInRight.springify().stiffness(50).damping(6).mass(0.3)}
        exiting={SlideOutRight.springify().stiffness(50).damping(6).mass(0.3)}
        style={[tw.style('absolute items-center justify-center h-full -bottom-8 right-3')]}
      >
        <AlertText style={tw.style('text-sm', errorStyle)}>{error}</AlertText>
      </Animated.View>
    </Card>
  )
}

Picker.defaultProps = {
  style: undefined,
  onValueChange: (value: string) => value,
  value: undefined,
  innerRef: undefined,
  error: undefined,
  errorStyle: undefined
}
