import _ from 'lodash'
import React from 'react'
import { View } from 'react-native'
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated'
import Svg, { Rect } from 'react-native-svg'
import { ClassInput } from 'twrnc/dist/esm/types'
import useWorkoutStore from '../hooks/use-workout-store'
import tw from '../tailwind'
import { Weight } from '../types'
import { plateWeights, sumPlateWeights } from '../utils'
import { SecondaryText } from './Themed'

type Props = {
  style?: ClassInput
  totalWeight: Weight
}

/**
 * Estimate the logarithm base 10 of a small integer.
 *
 * @param {number} x - The integer to estimate the logarithm of.
 * @return {number} - The estimated logarithm of the integer.
 */
function Plate({ weight, index }: { weight: Weight; index: number }) {
  const { svgProps } = _.find(plateWeights, v => v.weight === String(weight.value))!

  return (
    <Animated.View entering={FadeIn.duration(500)} exiting={FadeOut.duration(500)}>
      <SecondaryText
        style={tw`px-3 text-sm`}
      >{`1x ${weight.value} ${weight.unit} plate`}</SecondaryText>
      <Svg style={tw`mt-9 ml-[${index * 15}}px] absolute`}>
        {/* <Line
          x1={0}
          y1={0}
          x2={100}
          y2={100}
          strokeWidth={2}
          stroke="#B5B6B7"
          strokeDasharray="6 6"
        /> */}
        <Rect
          height={svgProps.height}
          width={svgProps.width}
          fill={svgProps.fill}
          rx={svgProps.rx}
        />
      </Svg>
    </Animated.View>
  )
}

const calcPlateConfig = (
  remainingWeight: number,
  availPlates: Weight[] = [],
  usedPlates: Weight[] = []
): Weight[] => {
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

export default function PlateChart({ style, totalWeight }: Props) {
  const equipment = useWorkoutStore(store => store.equipment)
  const platesPerSide = calcPlateConfig(totalWeight.value - equipment.barbellWeight.value, [
    ...equipment.platePairs
  ])

  return (
    <View>
      {platesPerSide.length > 0 &&
        sumPlateWeights(platesPerSide) * 2 + equipment.barbellWeight.value ===
          totalWeight.value && (
          <View style={tw.style(style)}>
            <Animated.View entering={FadeIn.duration(500)} exiting={FadeOut.duration(500)}>
              <SecondaryText style={tw`text-sm font-bold`}>Barbell Configuration:</SecondaryText>
            </Animated.View>
            {platesPerSide.map((plate, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <Plate key={`${plate.value}.${index}`} weight={plate} index={index} />
            ))}
          </View>
        )}
    </View>
  )
}
PlateChart.defaultProps = {
  style: undefined
}
