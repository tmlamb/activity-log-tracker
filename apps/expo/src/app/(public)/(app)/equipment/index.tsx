import { KeyboardAvoidingView, ScrollView, Text, View } from "react-native";
import Animated, {
  FadeInUp,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";
import { Stack, useRouter } from "expo-router";
import { Entypo } from "@expo/vector-icons";
import { Controller, useFieldArray, useForm } from "react-hook-form";

import type { Equipment } from "@activity-log/ui/utils";

import "react-native-get-random-values";

import { v4 as uuidv4 } from "uuid";

import { validWeights } from "@activity-log/ui/utils";

import { PrimaryCardAction } from "~/components/CardRow";
import { HeaderTextAction } from "~/components/HeaderAction";
import PressableThemed from "~/components/PressableThemed";
import TextInputThemed from "~/components/TextInputThemed";
import { HelperText, SectionHeading } from "~/components/Typography";
import useWorkoutStore from "~/hooks/use-workout-store";

export default function EquipmentScreen() {
  const router = useRouter();
  const { equipment, updateEquipment } = useWorkoutStore((state) => state);

  type FormData = Equipment;
  const { control, handleSubmit } = useForm<FormData>({
    defaultValues: equipment,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "platePairs",
  });

  const onSubmit = (data: FormData) => {
    updateEquipment({
      ...data,
      platePairs: data.platePairs
        .map((weight) => ({
          value: Number(weight.value),
          unit: weight.unit,
          platePairId: weight.platePairId,
        }))
        .sort((a, b) => a.value - b.value),
    });
    router.back();
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <HeaderTextAction
              label="Cancel"
              onPress={() => router.back()}
              accessibilityLabel="Go Back Without Saving"
              color="foreground"
            />
          ),
          headerRight: () => (
            <HeaderTextAction
              label="Save"
              onPress={handleSubmit(onSubmit)}
              accessibilityLabel="Save Equipment Settings"
              weight="bold"
            />
          ),
        }}
      />

      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView contentContainerClassName="px-5 pt-34 gap-6 pb-18">
          <HelperText placement="blockStart">
            These settings will be used to calculate which plates to place on
            the barbell.
          </HelperText>
          <Controller
            name="barbellWeight"
            control={control}
            rules={{ required: true }}
            render={({
              field: { onChange, onBlur, value },
              fieldState: { error },
            }) => (
              <TextInputThemed
                label="Barbell Weight (lbs)"
                onChangeText={(newValue) => {
                  onChange({ value: Number(newValue), unit: "lbs" });
                }}
                onBlur={onBlur}
                value={String(value.value)}
                placeholder="0"
                maxLength={3}
                keyboardType="number-pad"
                numeric
                selectTextOnFocus
                error={error ? "Required" : undefined}
                accessibilityLabel="Barbell weight in pounds"
              />
            )}
          />
          <View>
            <SectionHeading>Plate Pairs (2x each)</SectionHeading>
            {fields.map((item, index) => (
              <Animated.View
                key={item.platePairId}
                entering={FadeInUp}
                exiting={FadeOutUp}
              >
                <View className="relative flex-row items-center justify-between">
                  <PressableThemed
                    className="absolute z-100 p-5"
                    onPress={() => remove(index)}
                    accessibilityLabel={`Remove plate pair with weight ${item.value}`}
                  >
                    <Text
                      maxFontSizeMultiplier={2.5}
                      className="text-destructive p-0 text-base"
                    >
                      <Entypo name="circle-with-minus" size={20} />
                    </Text>
                  </PressableThemed>
                  <Controller
                    name={`platePairs.${index}.value`}
                    control={control}
                    defaultValue={45}
                    rules={{
                      required: true,
                      validate: (value: number) =>
                        !!validWeights.find((w) => Number(w) === Number(value)),
                    }}
                    render={({
                      field: { onChange, onBlur, value },
                      fieldState: { error },
                    }) => (
                      <TextInputThemed
                        label="Plate Pair Weight (lbs)"
                        onChangeText={onChange}
                        onBlur={onBlur}
                        value={String(value)}
                        placeholder="0"
                        maxLength={4}
                        labelClassName="pl-10"
                        selectTextOnFocus
                        keyboardType="numeric"
                        numeric
                        error={error ? "Invalid plate size" : undefined}
                        errorClassName="top-0 mt-3.5"
                        accessibilityLabel="Plate pair weight in pounds"
                        stack={{
                          index,
                          size: fields.length + 1,
                        }}
                      />
                    )}
                  />
                </View>
              </Animated.View>
            ))}
            <Animated.View layout={LinearTransition}>
              <PrimaryCardAction
                label="Add Plate Pair"
                icon={<Entypo name="circle-with-plus" size={20} />}
                onPress={() =>
                  append({ value: 0, unit: "lbs", platePairId: uuidv4() })
                }
                disabled={fields.length > 100}
                stack={
                  fields.length > 0
                    ? { index: fields.length, size: fields.length + 1 }
                    : undefined
                }
              />
            </Animated.View>
            <HelperText>
              Valid plate weights: {validWeights.join(", ")}
            </HelperText>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
