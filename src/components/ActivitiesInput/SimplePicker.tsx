import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { Platform } from 'react-native'
import RNPickerSelect from 'react-native-picker-select'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../../tailwind'
import Card from '../Card'
import { PrimaryText, SecondaryText, secondaryTextColor } from '../Typography'

type Props = {
  label: string
  items: { label: string; value: string; color: string }[]
  style?: ClassInput
  onValueChange?: (value: string) => void
  value?: string
}

interface PropsFilled extends Props {
  onValueChange: (value: string) => void
}

export default function SimplePicker({ label, items, style, onValueChange, value }: PropsFilled) {
  return (
    <Card
      style={tw.style('relative border-b-2 py-2', style, {
        cursor: 'pointer'
      })}
    >
      <PrimaryText style={tw`absolute py-2 pl-4 web:pt-0`}>{label}</PrimaryText>
      <RNPickerSelect
        // placeholder={{
        //   label: 'Warmup Sets',
        //   value: 3,
        //   color: '#9EA0A4'
        // }}
        placeholder={{}}
        pickerProps={{}}
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
            <SecondaryText>
              <AntDesign name="right" size={16} />
            </SecondaryText>
          )
        }
      />
    </Card>
  )
}

SimplePicker.defaultProps = {
  style: undefined,
  onValueChange: (value: string) => value,
  value: undefined
}
