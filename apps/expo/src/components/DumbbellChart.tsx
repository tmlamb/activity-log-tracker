import { View } from "react-native";
import { useNativeVariable } from "react-native-css";
import { FadeIn, FadeOut } from "react-native-reanimated";
import Svg, { Rect, Text } from "react-native-svg";

import { AnimatedViewStyled } from "./Styled";

interface DumbbellChartProps {
  className?: string;
  weight: number;
  unit?: "lbs" | "kg";
}

function Dumbbell({ weight }: { weight: number; unit: "lbs" | "kg" }) {
  const primaryColor = useNativeVariable("--primary") as string;
  const foregroundColor = useNativeVariable("--primary-foreground") as string;
  const handleColor = useNativeVariable("--muted") as string;

  return (
    <Svg width={130} height={100}>
      <Rect x={0} y={7} width={36} height={66} rx={5} fill={primaryColor} />
      <Rect x={37} y={30} width={52} height={20} rx={0} fill={handleColor} />
      <Rect x={90} y={7} width={36} height={66} rx={5} fill={primaryColor} />
      <Text
        fill={foregroundColor}
        fontSize="14"
        fontWeight="bold"
        x="48.5%"
        y="41%"
        alignmentBaseline="middle"
        textAnchor="middle"
      >
        {weight}
      </Text>
    </Svg>
  );
}

export default function DumbbellChart({
  className,
  weight,
  unit = "lbs",
}: DumbbellChartProps) {
  return (
    <View className={`items-center ${className ?? ""}`}>
      <AnimatedViewStyled
        className="flex-row items-center justify-center gap-4"
        entering={FadeIn.duration(500)}
        exiting={FadeOut.duration(500)}
      >
        <Dumbbell weight={weight} unit={unit} />
        <Dumbbell weight={weight} unit={unit} />
      </AnimatedViewStyled>
    </View>
  );
}
