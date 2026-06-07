import { type ColorSchemeName, type LayoutRectangle } from "react-native";
import type { StyleDescriptor } from "react-native-css/compiler";
export type Effect = {
    observers: Set<Effect>;
    run(): void;
};
export type Observable<Value, Arg = Value> = {
    observers: Set<Effect>;
    get: (effect?: Effect) => Value;
    set: (arg: Arg) => void;
    run: () => void;
};
type Read<Value, Arg> = (get: Getter, arg?: Arg) => Value;
export type Getter = <Value>(observable: Observable<Value, any>) => Value;
export declare const observableBatch: {
    current?: Set<Effect>;
};
export declare function observable<Value, Arg = Value>(init: Value | Read<Value, Arg>, equality?: (value1: Value, value2: Value) => boolean): Observable<Value, Arg>;
export declare function cleanupEffect(effect: Effect): void;
/** Family Helpers ************************************************************/
export declare function family<Key, Result = Key, Args extends any = void>(fn: (key: Key, args: Args) => Result): ((key: Key, args: Args) => Result) & {
    delete(key: Key): boolean;
    clear(): void;
};
type WeakFamilyFn<Key, Args = undefined, Result = Key> = ((key: Key, args: Args) => Result) & {
    has(key: Key): boolean;
};
export declare function weakFamily<Key extends WeakKey, Result = Key>(fn: (key: Key) => Result): WeakFamilyFn<Key, void, Result>;
export declare function weakFamily<Key extends WeakKey, Args = undefined, Result = Key>(fn: (key: Key, args: Args) => Result): WeakFamilyFn<Key, Args, Result>;
/********************************* Variables **********************************/
export declare const VAR_SYMBOL: unique symbol;
export type VariableContextValue = Record<string, StyleDescriptor> & {
    [VAR_SYMBOL]: true;
};
/** Pseudo Classes ************************************************************/
export declare const hoverFamily: WeakFamilyFn<WeakKey, void, Observable<boolean, boolean>>;
export declare const activeFamily: WeakFamilyFn<WeakKey, void, Observable<boolean, boolean>>;
export declare const focusFamily: WeakFamilyFn<WeakKey, void, Observable<boolean, boolean>>;
/** Dimensions ****************************************************************/
export declare const dimensions: Observable<import("react-native").ScaledSize, import("react-native").ScaledSize>;
export declare const vw: Observable<number, number>;
export declare const vh: Observable<number, number>;
/** Color Scheme **************************************************************/
export declare const colorScheme: Observable<ColorSchemeName, ColorSchemeName>;
/** Containers ****************************************************************/
export type ContainerContextValue = Record<string, WeakKey>;
export declare const ContainerContext: import("react").Context<ContainerContextValue>;
export declare const containerLayoutFamily: WeakFamilyFn<WeakKey, void, Observable<LayoutRectangle, LayoutRectangle>>;
export declare const containerWidthFamily: WeakFamilyFn<WeakKey, void, Observable<number, number>>;
export declare const containerHeightFamily: WeakFamilyFn<WeakKey, void, Observable<number, number>>;
export {};
//# sourceMappingURL=reactivity.d.ts.map