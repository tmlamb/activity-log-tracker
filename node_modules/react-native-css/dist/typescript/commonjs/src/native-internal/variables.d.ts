import { type PropsWithChildren } from "react";
import type { StyleDescriptor } from "react-native-css/compiler";
import { type VariableContextValue } from "../native/reactivity";
export declare const VariableContext: import("react").Context<VariableContextValue>;
export declare function VariableContextProvider(props: PropsWithChildren<{
    value: Record<`--${string}`, StyleDescriptor>;
}>): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=variables.d.ts.map