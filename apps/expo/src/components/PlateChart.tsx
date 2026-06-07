import { View } from "react-native";
import { useNativeVariable } from "react-native-css";
import { FadeIn, FadeOut } from "react-native-reanimated";
import Svg, { Rect, Text } from "react-native-svg";
import _ from "lodash";

import type { Equipment, PlatePair } from "@activity-log/ui/utils";
import { sumPlateWeights } from "@activity-log/ui/utils";

import { AnimatedViewStyled } from "./Styled";

interface Props {
  className?: string;
  totalWeight: number;
  equipment: Equipment;
}

function Plate({
  weight,
  width,
  fill,
}: {
  weight: number;
  width?: number;
  fill?: string;
}) {
  const foregroundColor = useNativeVariable("--secondary-foreground") as string;
  return (
    <Svg
      style={{ marginBottom: 0.5 }}
      width={width ?? Math.log(weight) * 50}
      height={20}
    >
      <Rect width="100%" height="100%" fill={fill} rx={3} />
      <Text
        fill={foregroundColor}
        fontSize="14"
        fontWeight="bold"
        x="50%"
        y="57.5%"
        alignmentBaseline="middle"
        textAnchor="middle"
      >
        {weight}
      </Text>
    </Svg>
  );
}

const calcPlateConfig = (
  remainingWeight: number,
  availPlates: PlatePair[] = [],
  usedPlates: PlatePair[] = [],
): PlatePair[] => {
  let nextPlate = availPlates.pop();
  let reducedWeight = remainingWeight;
  if (remainingWeight === 0 || !nextPlate) {
    return usedPlates;
  }

  while (nextPlate && remainingWeight - nextPlate.value * 2 < 0) {
    nextPlate = availPlates.pop();
  }

  if (nextPlate) {
    usedPlates.push(nextPlate);
    reducedWeight -= nextPlate.value * 2;
  }

  return calcPlateConfig(reducedWeight, availPlates, usedPlates);
};

export default function PlateChart({
  className,
  totalWeight,
  equipment,
}: Props) {
  const primaryColor = useNativeVariable("--primary") as string;
  const accentColor = useNativeVariable("--info") as string;
  const warningColor = useNativeVariable("--warning") as string;
  const destructiveColor = useNativeVariable("--destructive") as string;
  const plateColors = [
    primaryColor,
    accentColor,
    warningColor,
    destructiveColor,
  ];

  const plates = calcPlateConfig(totalWeight - equipment.barbellWeight.value, [
    ...equipment.platePairs,
  ]);
  plates.reverse();
  const marginTop = Math.max(60 / plates.length, 36);

  return (
    <View className={`items-center ${className ?? ""}`}>
      {plates.length > 0 &&
        sumPlateWeights(_.map(plates, (w) => w.value)) * 2 +
          equipment.barbellWeight.value ===
          totalWeight && (
          <AnimatedViewStyled
            className="items-center"
            entering={FadeIn.duration(500)}
            exiting={FadeOut.duration(500)}
          >
            <Svg width={18} height={marginTop - 4}>
              <Rect height="100%" width="100%" fill="#91a0b6" rx={1.5} />
            </Svg>
            <View className={`items-center justify-start mt-[${marginTop}px]`}>
              {plates.map((plate, index) => (
                <Plate
                  key={plate.platePairId}
                  weight={plate.value}
                  fill={
                    plateColors[
                      (index > 0 && plates[index - 1]?.value === plate.value
                        ? plates.findIndex((p) => p.value === plate.value)
                        : index) % 4
                    ]
                  }
                />
              ))}
            </View>
            <View className="items-center">
              <Plate
                weight={equipment.barbellWeight.value}
                width={35}
                fill="#91a0b6"
              />
            </View>
          </AnimatedViewStyled>
        )}
    </View>
  );
}
