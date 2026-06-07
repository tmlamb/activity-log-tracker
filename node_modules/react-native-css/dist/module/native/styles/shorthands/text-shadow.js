"use strict";

import { shorthandHandler } from "./_handler.js";
const width = [["textShadowOffset", "width"], "number"];
const height = [["textShadowOffset", "height"], "number"];
const blur = ["textShadowRadius", "number", "textShadowRadius"];
const color = ["textShadowColor", "color", "color"];
export const textShadow = shorthandHandler([[width, height, blur, color], [color, width, height, blur], [width, height, color], [color, width, height], [width, height]], [blur, color]);
//# sourceMappingURL=text-shadow.js.map