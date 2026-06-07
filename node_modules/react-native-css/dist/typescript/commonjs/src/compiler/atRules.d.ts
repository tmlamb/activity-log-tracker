import type { DeclarationBlock, ParsedComponent, Rule, TokenOrValue } from "lightningcss";
import type { StyleRuleMapping } from "./compiler.types";
import type { StylesheetBuilder } from "./stylesheet";
export interface PropAtRule {
    type: "unknown";
    value: {
        name: "prop";
        prelude: Extract<TokenOrValue, {
            type: "token";
        }>[];
        block: Extract<TokenOrValue, {
            type: "token";
        }>[] | null;
    };
}
/***********************************************
 * @react-native                               *
 ***********************************************/
export interface ReactNativeAtRule {
    type: "custom";
    value: {
        name: "react-native";
        prelude: null | Extract<ParsedComponent, {
            type: "repeated";
        }>;
        body: {
            type: "declaration-list";
            value: Pick<DeclarationBlock, "declarations">;
        };
    };
}
export declare function maybeMutateReactNativeOptions(rule: Rule | ReactNativeAtRule, _builder: StylesheetBuilder): void;
export declare function parsePropAtRule(rules?: (Rule | PropAtRule)[]): StyleRuleMapping;
//# sourceMappingURL=atRules.d.ts.map