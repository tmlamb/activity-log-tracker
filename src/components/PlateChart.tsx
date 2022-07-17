import React from 'react'
import { View } from 'react-native'
import { ClassInput } from 'twrnc/dist/esm/types'
import useWorkoutStore from '../hooks/use-workout-store'
import tw from '../tailwind'
import { Weight } from '../types'
import { SecondaryText } from './Typography'

type Props = {
  style?: ClassInput
  totalWeight: Weight
}

function Plate({ weight }: { weight: Weight }) {
  return (
    <>
      {/* test */}
      <View
      // style={tw`absolute w-[${weight.value / 12}px] py-[${weight.value}] rounded-sm bg-slate-700`}
      >
        <SecondaryText
          style={tw`px-3 text-xs`}
        >{`1x ${weight.value} ${weight.unit} plate`}</SecondaryText>
      </View>
    </>
  )
}

const sumPlateWeights = (plates: Weight[]) => plates.reduce((total, p) => total + p.value, 0)

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
  //   const totalPlatesWeight = equipment && sumPlateWeights(equipment.platePairs)
  const platesPerSide = calcPlateConfig(totalWeight.value - equipment.barbellWeight.value, [
    ...equipment.platePairs
  ])

  //   const platesPerSide2 =
  //     totalPlatesWeight &&
  //     totalPlatesWeight > totalWeight.value &&
  //     equipment?.plates.reduce((total, p) => {
  //       if (true) {
  //         total.push(p)
  //       }

  //       return total
  //     }, [])

  return (
    <View style={tw.style(style)}>
      {platesPerSide.length > 0 && (
        <SecondaryText style={tw`text-sm`}>Barbell Configuration:</SecondaryText>
      )}
      {platesPerSide.map((plate, index) => (
        // eslint-disable-next-line react/no-array-index-key
        <Plate key={`${plate.value}.${index}`} weight={plate} />
      ))}
    </View>
  )
}

PlateChart.defaultProps = {
  style: undefined
}
