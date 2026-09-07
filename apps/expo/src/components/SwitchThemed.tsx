import type { SwitchProps } from "react-native";
import { Switch } from "react-native";
import { useNativeVariable } from "react-native-css";

export default function SwitchThemed({ trackColor, ...props }: SwitchProps) {
  const primaryColor = useNativeVariable("--primary") as string;

  return (
    <Switch trackColor={{ true: primaryColor, ...trackColor }} {...props} />
  );
}
