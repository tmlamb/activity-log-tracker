import type { StyleDescriptor, VariableValue } from "react-native-css/compiler";
import { type Observable } from "../native/reactivity";
export declare const rootVariables: ((key: string, args: void) => Observable<StyleDescriptor, VariableValue[]>) & {
    delete(key: string): boolean;
    clear(): void;
};
export declare const universalVariables: ((key: string, args: void) => Observable<StyleDescriptor, VariableValue[]>) & {
    delete(key: string): boolean;
    clear(): void;
};
//# sourceMappingURL=root.d.ts.map