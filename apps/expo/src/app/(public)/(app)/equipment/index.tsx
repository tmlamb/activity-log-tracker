import { KeyboardAvoidingView, ScrollView } from "react-native";
import Animated, {
  FadeInUp,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";
import { Stack, useRouter } from "expo-router";
import { Entypo } from "@expo/vector-icons";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";

import type { Equipment } from "@activity-log/ui/utils";

import "react-native-get-random-values";

import { v4 as uuidv4 } from "uuid";

import { PrimaryCardAction } from "~/components/CardRow";
import ConfirmButton from "~/components/ConfirmButton";
import { HeaderTextAction } from "~/components/HeaderAction";
import InventoryCounterInputRow from "~/components/InventoryCounterInputRow";
import { HelperText, SectionHeading } from "~/components/Typography";
import useWorkoutStore, {
  createDefaultEquipment,
} from "~/hooks/use-workout-store";

type FormEquipmentBarbell = Omit<Equipment["barbells"][number], "value"> & {
  value: number | string;
};
type FormEquipmentPlate = Omit<
  Equipment["plates"][number],
  "quantity" | "value"
> & {
  quantity: number | string;
  value: number | string;
};

interface FormData {
  barbells: FormEquipmentBarbell[];
  plates: FormEquipmentPlate[];
}

const normalizeEquipmentFormData = (
  equipment: Partial<Equipment>,
): Equipment => ({
  barbells: equipment.barbells ?? [],
  plates: equipment.plates ?? [],
});

const normalizeWeightInput = (value: string) => {
  const cleaned = value.replace(/[^0-9.]/g, "");
  const [integerRaw = "", ...fractionParts] = cleaned.split(".");
  const integer = integerRaw.replace(/^0+(?=\d)/g, "");

  if (!cleaned.includes(".")) return integer;

  const normalizedInteger = integer || "0";
  return `${normalizedInteger}.${fractionParts.join("").slice(0, 3)}`;
};

const validateUniqueWeight = <T extends { value: number | string }>(
  value: number | string,
  index: number,
  allItems: T[],
  options: { allowZero?: boolean } = {},
) => {
  const weightText = String(value).trim();
  const weight = Number(weightText);

  if (
    !weightText ||
    Number.isNaN(weight) ||
    (options.allowZero ? weight < 0 : weight <= 0)
  ) {
    return "Required";
  }

  if (!/^\d+(\.\d{0,3})?$/.test(weightText)) {
    return "Use up to 3 decimals";
  }

  if (weight > 250) {
    return "Must be 250 lbs or less";
  }

  if (
    allItems.some((item, itemIndex) => {
      const itemWeightText = String(item.value).trim();

      return (
        itemIndex < index && itemWeightText && Number(itemWeightText) === weight
      );
    })
  ) {
    return "Already added";
  }

  return true;
};

export default function EquipmentScreen() {
  const router = useRouter();
  const { equipment, updateEquipment } = useWorkoutStore((state) => state);
  const defaultValues = normalizeEquipmentFormData(equipment);

  const { control, getValues, handleSubmit, reset, setValue } =
    useForm<FormData>({
      defaultValues,
    });

  const {
    fields: barbellFields,
    append: appendBarbell,
    remove: removeBarbell,
  } = useFieldArray({
    control,
    name: "barbells",
  });

  const {
    fields: plateFields,
    append: appendPlate,
    remove: removePlate,
  } = useFieldArray({
    control,
    name: "plates",
  });

  const plates = useWatch({ control, name: "plates" });

  const onSubmit = (data: FormData) => {
    updateEquipment({
      ...data,
      barbells: data.barbells
        .map((barbell) => ({
          value: Number(barbell.value),
          unit: barbell.unit,
          barbellId: barbell.barbellId,
        }))
        .sort((a, b) => a.value - b.value),
      plates: data.plates
        .map((plate) => ({
          value: Number(plate.value),
          unit: plate.unit,
          plateId: plate.plateId,
          quantity: Number(plate.quantity),
        }))
        .sort((a, b) => a.value - b.value),
    });
    router.back();
  };

  const changePlateQuantity = (index: number, delta: number) => {
    const currentQuantity = Number(getValues(`plates.${index}.quantity`));

    if (delta < 0 && currentQuantity <= 0) {
      removePlate(index);
      return;
    }

    setValue(`plates.${index}.quantity`, Math.max(0, currentQuantity + delta), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const addBarbell = () => {
    appendBarbell(
      { value: "", unit: "lbs", barbellId: uuidv4() },
      { focusName: `barbells.${barbellFields.length}.value` },
    );
  };

  const addPlate = () => {
    appendPlate(
      {
        value: 0,
        unit: "lbs",
        plateId: uuidv4(),
        quantity: 2,
      },
      { focusName: `plates.${plateFields.length}.value` },
    );
  };

  const restoreEquipmentDefaults = () => {
    const defaultEquipment = createDefaultEquipment();

    updateEquipment(defaultEquipment);
    reset(defaultEquipment);
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
        <ScrollView contentContainerClassName="px-5 pt-34 pb-18">
          <Animated.View layout={LinearTransition} className="gap-6">
            <HelperText placement="blockStart">
              These settings will be used to calculate which barbell and plates
              to use for each workout set.
            </HelperText>

            <Animated.View layout={LinearTransition}>
              <SectionHeading>Barbell Inventory</SectionHeading>
              {barbellFields.map((item, index) => {
                const stack = { index, size: barbellFields.length + 1 };

                return (
                  <Animated.View
                    key={item.barbellId}
                    entering={FadeInUp}
                    exiting={FadeOutUp}
                    layout={LinearTransition}
                  >
                    <Controller
                      name={`barbells.${index}.value`}
                      control={control}
                      rules={{
                        required: "Required",
                        validate: (value) =>
                          validateUniqueWeight(
                            value,
                            index,
                            getValues("barbells"),
                            {
                              allowZero: true,
                            },
                          ),
                      }}
                      render={({
                        field: { ref, onChange, onBlur, value },
                        fieldState: { error },
                      }) => (
                        <InventoryCounterInputRow
                          innerRef={ref}
                          value={String(value)}
                          onChangeText={(newValue) => {
                            onChange(normalizeWeightInput(newValue));
                          }}
                          onBlur={onBlur}
                          unit="lbs"
                          inputAccessibilityLabel="Barbell weight in pounds"
                          maxLength={4}
                          keyboardType="numeric"
                          error={error?.message}
                          stack={stack}
                          trailing={{
                            type: "remove",
                            onRemove: () => removeBarbell(index),
                            removeAccessibilityLabel: `Remove ${value} pound barbell`,
                            removeAccessibilityHint:
                              "Removes this barbell weight from the inventory.",
                          }}
                        />
                      )}
                    />
                  </Animated.View>
                );
              })}
              <Animated.View layout={LinearTransition}>
                <PrimaryCardAction
                  label="Add Barbell"
                  icon={<Entypo name="circle-with-plus" size={20} />}
                  onPress={addBarbell}
                  stack={
                    barbellFields.length > 0
                      ? {
                          index: barbellFields.length,
                          size: barbellFields.length + 1,
                        }
                      : undefined
                  }
                />
              </Animated.View>
            </Animated.View>

            <Animated.View layout={LinearTransition}>
              <SectionHeading>Plate Inventory</SectionHeading>
              {plateFields.map((item, index) => {
                const quantity = Number(
                  plates[index]?.quantity ?? item.quantity,
                );
                const stack = { index, size: plateFields.length + 1 };

                return (
                  <Animated.View
                    key={item.plateId}
                    entering={FadeInUp}
                    exiting={FadeOutUp}
                    layout={LinearTransition}
                  >
                    <Controller
                      name={`plates.${index}.value`}
                      control={control}
                      rules={{
                        required: "Required",
                        validate: (value) => {
                          return validateUniqueWeight(
                            value,
                            index,
                            getValues("plates"),
                          );
                        },
                      }}
                      render={({
                        field: { ref, onChange, onBlur, value },
                        fieldState: { error },
                      }) => (
                        <InventoryCounterInputRow
                          innerRef={ref}
                          value={String(value)}
                          onChangeText={(newValue) => {
                            onChange(normalizeWeightInput(newValue));
                          }}
                          onBlur={onBlur}
                          unit="lbs"
                          inputAccessibilityLabel="Plate weight in pounds"
                          maxLength={7}
                          error={error?.message}
                          stack={stack}
                          trailing={{
                            type: "counter",
                            count: quantity,
                            countUnit: "plates",
                            onDecrement: () => changePlateQuantity(index, -2),
                            onIncrement: () => changePlateQuantity(index, 2),
                            decrementAccessibilityLabel:
                              quantity <= 0
                                ? `Remove ${value} pound plates from inventory`
                                : `Decrease ${value} pound plate count by two`,
                            decrementAccessibilityHint:
                              quantity <= 0
                                ? "Removes this plate weight from the inventory."
                                : "Reduces the plate count by two. At two plates, the next decrement changes the count to zero.",
                            incrementAccessibilityLabel: `Increase ${value} pound plate count by two`,
                            incrementAccessibilityHint:
                              "Adds two plates to this plate weight.",
                          }}
                        />
                      )}
                    />
                  </Animated.View>
                );
              })}
              <Animated.View layout={LinearTransition}>
                <PrimaryCardAction
                  label="Add Plates"
                  icon={<Entypo name="circle-with-plus" size={20} />}
                  onPress={addPlate}
                  disabled={plateFields.length > 100}
                  stack={
                    plateFields.length > 0
                      ? {
                          index: plateFields.length,
                          size: plateFields.length + 1,
                        }
                      : undefined
                  }
                />
              </Animated.View>
            </Animated.View>
          </Animated.View>

          <Animated.View layout={LinearTransition} className="mt-10">
            <ConfirmButton
              accessibilityLabel="Restore default equipment inventory"
              title="Restore Equipment Defaults?"
              message="This will permanently replace your equipment settings with the default barbell and plate inventory."
              confirmText="Restore Defaults"
              onConfirm={restoreEquipmentDefaults}
            >
              Restore Defaults
            </ConfirmButton>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
