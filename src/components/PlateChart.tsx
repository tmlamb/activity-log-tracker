import _ from 'lodash'
import React from 'react'
import { Platform, View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import Svg, { Rect, Text } from 'react-native-svg'
import { ClassInput } from 'twrnc/dist/esm/types'
import tw from '../tailwind'
import { Equipment, PlatePair, Weight } from '../types'
import { sumPlateWeights } from '../utils'

type Props = {
  style?: ClassInput
  totalWeight: Weight
  equipment: Equipment
}

const plateColors = ['#38bdf8', '#f60', '#fbbc04', '#f87171']

function Plate({ weight, width, fill }: { weight: number; width?: number; fill?: string }) {
  return (
    <Svg style={tw`mb-[1px]`} width={width || Math.log(weight) * 50} height={20}>
      <Rect width="100%" height="100%" fill={fill} rx={3} />
      <Text
        fill="#1c1c1c"
        fontSize="14"
        fontWeight="bold"
        x="50%"
        y={Platform.OS === 'web' ? '80%' : '55%'}
        alignmentBaseline="middle"
        textAnchor="middle"
      >
        {weight}
      </Text>
    </Svg>
  )
}
Plate.defaultProps = {
  width: undefined,
  fill: undefined
}

const calcPlateConfig = (
  remainingWeight: number,
  availPlates: PlatePair[] = [],
  usedPlates: PlatePair[] = []
): PlatePair[] => {
  let nextPlate = availPlates.pop()
  let reducedWeight = remainingWeight
  if (remainingWeight === 0 || !nextPlate) {
    return usedPlates
  }

  while (nextPlate && remainingWeight - nextPlate.value * 2 < 0) {
    nextPlate = availPlates.pop()
  }

  if (nextPlate) {
    usedPlates.push(nextPlate)
    reducedWeight -= nextPlate.value * 2
  }

  return calcPlateConfig(reducedWeight, availPlates, usedPlates)
}

export default function PlateChart({ style, totalWeight, equipment }: Props) {
  const plates = calcPlateConfig(totalWeight.value - equipment.barbellWeight.value, [
    ...equipment.platePairs
  ])
  plates.reverse()
  const marginTop = Math.max(60 / plates.length, 36)
  return (
    <View style={tw.style(style, 'items-center')}>
      {plates.length > 0 &&
        sumPlateWeights(_.map(plates, weight => weight.value)) * 2 +
          equipment.barbellWeight.value ===
          totalWeight.value && (
          <Animated.View entering={FadeIn.duration(500)} exiting={FadeOut.duration(500)}>
            <View style={tw`absolute self-center`}>
              <Svg width={18} height={marginTop - 1}>
                <Rect height="100%" width="100%" fill="#91a0b6" rx={1.5} />
              </Svg>
            </View>
            <View style={tw`items-center justify-start mt-[${marginTop}px]`}>
              {plates.map(
                (plate, index) =>
                  plate && (
                    <Plate
                      key={plate.platePairId}
                      weight={plate.value}
                      fill={
                        plateColors[
                          (index > 0 && plates[index - 1].value === plate.value
                            ? plates.findIndex(p => p.value === plate.value)
                            : index) % 4
                        ]
                      }
                    />
                  )
              )}
            </View>
            <View style={tw`items-center`}>
              <Plate weight={equipment.barbellWeight.value} width={35} fill="#91a0b6" />
            </View>
          </Animated.View>
        )}
    </View>
  )
}
PlateChart.defaultProps = {
  style: undefined
}
