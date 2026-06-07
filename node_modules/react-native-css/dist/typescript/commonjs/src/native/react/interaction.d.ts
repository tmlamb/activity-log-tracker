import { type Getter as WeakKey } from "../reactivity";
type Handler = (event: unknown) => void;
export type InteractionType = "onLayout" | "onHoverIn" | "onHoverOut" | "onPress" | "onPressIn" | "onPressOut" | "onFocus" | "onBlur";
export declare function getInteractionHandler(weakKey: WeakKey, type: InteractionType, handler?: Handler): (event: any) => void;
export {};
//# sourceMappingURL=interaction.d.ts.map