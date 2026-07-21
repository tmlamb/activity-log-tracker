import { View } from "react-native";
import { useNativeVariable } from "react-native-css";
import { FadeIn, FadeOut } from "react-native-reanimated";
import Svg, { Circle, Path, Text } from "react-native-svg";

import { AnimatedViewStyled } from "./Styled";

interface SingleWeightChartProps {
  className?: string;
  weight: number;
  unit?: "lbs" | "kg";
}

export default function SingleWeightChart({
  className,
  weight,
}: SingleWeightChartProps) {
  const foregroundColor = useNativeVariable("--primary-foreground") as string;
  const handleColor = useNativeVariable("--muted") as string;

  return (
    <View className={`items-center ${className ?? ""}`}>
      <AnimatedViewStyled
        className="items-center"
        entering={FadeIn.duration(500)}
        exiting={FadeOut.duration(500)}
      >
        <Svg width={112} height={132}>
          <Circle
            cx={56}
            cy={26}
            r={12}
            fill="none"
            stroke={handleColor}
            strokeWidth={8}
          />
          <Path d="M32 40 L80 40 L100 100 L12 100 Z" fill={handleColor} />
          <Text
            fill={foregroundColor}
            fontSize="14"
            fontWeight="bold"
            x="50%"
            y="54%"
            alignmentBaseline="middle"
            textAnchor="middle"
          >
            {weight}
          </Text>
        </Svg>
      </AnimatedViewStyled>
    </View>
  );
}
