import type { JsTransformerConfig, JsTransformOptions, TransformResponse } from "metro-transform-worker";
import { type CompilerOptions } from "../compiler";
export declare function transform(config: JsTransformerConfig, projectRoot: string, filePath: string, data: Buffer, options: JsTransformOptions & {
    reactNativeCSS?: CompilerOptions | undefined;
}): Promise<TransformResponse>;
//# sourceMappingURL=metro-transformer.d.ts.map