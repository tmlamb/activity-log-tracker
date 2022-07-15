import React from 'react'
import { View } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import { tw } from '../tailwind'
import { Equipment, Weight } from '../types'

type Props = {
  style?: ClassInput
  totalWeight: Weight
  equipment?: Equipment
}

function Plate({ plate }: { plate: Weight }) {
  return (
    <>
      {/* test */}
      <View
        style={tw`absolute w-[${plate.value / 12}px] py-[${plate.value}] rounded-sm bg-slate-700`}
      />
    </>
  )
}

export default function PlateChart({ style, totalWeight, equipment }: Props) {
  const plateConfiguration = React.useMemo(() => {
    const config2: Weight[] = [{ value: 45, unit: 'lbs' }]
    return config2
  }, [])

  return (
    <View style={tw.style(style)}>
      <View
        style={tw.style(
          'rounded-sm dark:bg-slate-400 dark:border-slate-700 border-slate-300 bg-slate-400 py-1 mt-9 relative'
        )}
      >
        <View>
          {plateConfiguration.map(
            plate =>
              (plate.value === 55 && (
                <View key={55} style={tw`absolute w-[15px] py-16 rounded-sm bg-slate-700`} />
              )) ||
              (plate.value === 45 && (
                <View key={45} style={tw`absolute left-0 w-[15px] rounded-sm py-14 bg-slate-700`} />
              )) ||
              (plate.value === 35 && (
                <View key={35} style={tw`absolute left-0 w-[12px] rounded-sm py-14 bg-slate-700`} />
              )) ||
              (plate.value === 25 && <View key={25} />) ||
              (plate.value === 10 && <View key={10} />) ||
              (plate.value === 5 && <View key={5} />) ||
              (plate.value === 2.5 && <View key={2.5} />) ||
              (plate.value === 1.25 && <View key={1.25} />)
          )}
        </View>
        <View>
          <View />
        </View>
      </View>
    </View>
  )
}

PlateChart.defaultProps = {
  style: undefined,
  equipment: undefined
}
