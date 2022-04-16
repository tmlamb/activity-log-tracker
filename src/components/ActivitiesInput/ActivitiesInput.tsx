import { AntDesign } from '@expo/vector-icons'
import React from 'react'
import { View } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../../tailwind'
import { Activity } from '../../types'
import Card from '../Card'
import CardInfo from '../CardInfo'
import { AlertText, PrimaryText, SecondaryText, SpecialText } from '../Typography'
import SimplePicker from './SimplePicker'

type Props = {
  activities?: Activity[]
  style?: ClassInput
}

export default function ActivitiesInput({ activities, style }: Props) {
  console.log(activities)
  return (
    <View style={tw.style(style)}>
      <Card
        style={tw`flex flex-row items-center justify-between border-b-2 border-slate-300 dark:border-slate-700`}
      >
        <View style={tw`flex flex-row items-center justify-between w-6/12 pr-1`}>
          <AlertText style={tw`w-2/12`}>
            <AntDesign name="minuscircle" size={20} />
          </AlertText>
          <SpecialText style={tw`tracking-tight text-lg w-9/12 pl-2.5 break-all`}>
            Barbell Bench Press
          </SpecialText>
          <SecondaryText style={tw`w-1/12`}>
            <AntDesign name="right" size={16} />
          </SecondaryText>
        </View>
        <View style={tw`flex flex-col items-stretch justify-between w-6/12`}>
          <SimplePicker />
          <CardInfo
            style={tw`pl-2 pr-0 border-b-2 border-slate-300 dark:border-slate-700`}
            primaryText="Working Sets"
            secondaryText="3"
            rightIcon={
              <SecondaryText>
                <AntDesign name="right" size={16} />
              </SecondaryText>
            }
          />
          {/* <View
            style={tw`flex flex-row items-center justify-between py-1.5 pl-1.5 border-b-2 border-slate-300 dark:border-slate-700`}
          >
            <PrimaryText style={tw`tracking-tight`}>Warmup Sets</PrimaryText>
            <View style={tw`flex flex-row items-center`}>
              <SecondaryText style={tw`pr-1.5`}>3</SecondaryText>
              <SecondaryText>
                <AntDesign name="right" size={16} />
              </SecondaryText>
            </View>
          </View> */}
          <View
            style={tw`flex flex-row items-center justify-between py-1.5 pl-1.5 border-b-2 border-slate-300 dark:border-slate-700`}
          >
            <PrimaryText>Working Sets</PrimaryText>
            <View style={tw`flex flex-row items-center`}>
              <SecondaryText style={tw`pr-1.5`}>3</SecondaryText>
              <SecondaryText>
                <AntDesign name="right" size={16} />
              </SecondaryText>
            </View>
          </View>
          <View
            style={tw`flex flex-row items-center justify-between py-1.5 pl-1.5 border-b-2 border-slate-300 dark:border-slate-700`}
          >
            <PrimaryText>Reps</PrimaryText>
            <View style={tw`flex flex-row items-center`}>
              <SecondaryText style={tw`pr-1.5`}>5</SecondaryText>
              <SecondaryText>
                <AntDesign name="right" size={16} />
              </SecondaryText>
            </View>
          </View>
          <View
            style={tw`flex flex-row items-center justify-between py-1.5 pl-1.5 border-b-2 border-slate-300 dark:border-slate-700`}
          >
            <PrimaryText>Load</PrimaryText>
            <View style={tw`flex flex-row items-center`}>
              <SecondaryText style={tw`pr-1.5`}>77.5%</SecondaryText>
              <SecondaryText>
                <AntDesign name="right" size={16} />
              </SecondaryText>
            </View>
          </View>
          <View style={tw`flex flex-row items-center justify-between py-1.5 pl-1.5`}>
            <PrimaryText>Rest</PrimaryText>
            <View style={tw`flex flex-row items-center`}>
              <SecondaryText style={tw`pr-1.5`}>3 min</SecondaryText>
              <SecondaryText>
                <AntDesign name="right" size={16} />
              </SecondaryText>
            </View>
          </View>
        </View>
      </Card>
      <Card style={tw`flex flex-row items-center justify-start`}>
        <SpecialText>
          <AntDesign name="pluscircle" size={20} />
        </SpecialText>
        <PrimaryText style={tw`pl-4`}>Add Activity Button</PrimaryText>
      </Card>
    </View>
  )
}

ActivitiesInput.defaultProps = {
  activities: undefined,
  style: undefined
}
