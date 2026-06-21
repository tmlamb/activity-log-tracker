import { View } from "react-native";
import { useNativeVariable } from "react-native-css";
import { FadeIn, FadeOut } from "react-native-reanimated";
import Svg, { Rect, Text } from "react-native-svg";
import _ from "lodash";

import type {
  Equipment,
  EquipmentBarbell,
  Weight,
} from "@activity-log/ui/utils";
import { sumPlateWeights } from "@activity-log/ui/utils";

import { AnimatedViewStyled } from "./Styled";

interface Props {
  className?: string;
  totalWeight: number;
  equipment: Equipment;
}

type LoadablePlatePair = Weight & {
  platePairId: string;
};

interface LoadConfig {
  barbell: EquipmentBarbell;
  plates: LoadablePlatePair[];
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
  availPlates: LoadablePlatePair[] = [],
  usedPlates: LoadablePlatePair[] = [],
): LoadablePlatePair[] => {
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

const calcLoadConfig = (
  totalWeight: number,
  barbells: EquipmentBarbell[],
  availablePlatePairs: LoadablePlatePair[],
): LoadConfig | undefined => {
  const sortedBarbells = [...barbells].sort((a, b) => b.value - a.value);

  for (const barbell of sortedBarbells) {
    const remainingWeight = totalWeight - barbell.value;

    if (remainingWeight < 0) continue;

    const plates = calcPlateConfig(remainingWeight, [...availablePlatePairs]);

    if (
      sumPlateWeights(_.map(plates, (w) => w.value)) * 2 + barbell.value ===
      totalWeight
    ) {
      return { barbell, plates };
    }
  }

  return undefined;
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

  const availablePlatePairs = [...equipment.plates]
    .sort((a, b) => a.value - b.value)
    .flatMap((plate) =>
      Array.from({ length: Math.floor(plate.quantity / 2) }, (_, index) => ({
        value: plate.value,
        unit: plate.unit,
        platePairId: `${plate.plateId}-${index}`,
      })),
    );
  const loadConfig = calcLoadConfig(
    totalWeight,
    equipment.barbells,
    availablePlatePairs,
  );
  const plates = loadConfig?.plates ?? [];
  plates.reverse();
  const marginTop = plates.length > 0 ? Math.max(60 / plates.length, 36) : 36;

  return (
    <View className={`items-center ${className ?? ""}`}>
      {loadConfig && (
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
              weight={loadConfig.barbell.value}
              width={35}
              fill="#91a0b6"
            />
          </View>
        </AnimatedViewStyled>
      )}
    </View>
  );
}
