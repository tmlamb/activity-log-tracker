/** Metro resolves bundled images (including @2x/@3x variants) to an asset ID. */
declare module "*.png" {
  import type { ImageSourcePropType } from "react-native";

  const source: ImageSourcePropType;
  export default source;
}
