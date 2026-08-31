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
  barbell?: EquipmentBarbell;
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
  const foregroundColor = useNativeVariable(
    "--plate-chart-foreground",
  ) as string;
  return (
    <Svg
      style={{ marginBottom: 1 }}
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
  barbell,
}: Props) {
  const primaryColor = useNativeVariable("--plate-chart-primary") as string;
  const infoColor = useNativeVariable("--plate-chart-info") as string;
  const warningColor = useNativeVariable("--plate-chart-warning") as string;
  const destructiveColor = useNativeVariable(
    "--plate-chart-destructive",
  ) as string;
  const barbellColor = useNativeVariable("--muted") as string;
  const plateColors = [primaryColor, infoColor, warningColor, destructiveColor];

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
    barbell ? [barbell] : equipment.barbells,
    availablePlatePairs,
  );
  const plates = loadConfig?.plates ?? [];
  plates.reverse();
  const shaftHeight = 36 + Math.max(40 - 12 * plates.length, 0);

  return (
    <View className={`items-center ${className ?? ""}`}>
      {loadConfig && (
        <AnimatedViewStyled
          className="items-center"
          entering={FadeIn.duration(500)}
          exiting={FadeOut.duration(500)}
        >
          <Svg width={18} height={shaftHeight}>
            <Rect
              height={shaftHeight}
              width={18}
              fill={barbellColor}
              rx={1.5}
            />
          </Svg>
          <View className="items-center justify-start pt-px">
            {plates.map((plate, index) => {
              const colorIndex =
                (index > 0 && plates[index - 1]?.value === plate.value
                  ? plates.findIndex((p) => p.value === plate.value)
                  : index) % 4;
              return (
                <Plate
                  key={plate.platePairId}
                  weight={plate.value}
                  fill={plateColors[colorIndex]}
                />
              );
            })}
          </View>
          <View className="items-center">
            <Plate
              weight={loadConfig.barbell.value}
              width={35}
              fill={barbellColor}
            />
          </View>
        </AnimatedViewStyled>
      )}
    </View>
  );
}
