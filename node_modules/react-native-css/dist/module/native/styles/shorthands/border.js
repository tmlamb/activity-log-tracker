"use strict";

import { shorthandHandler } from "./_handler.js";
const width = ["borderWidth", "number"];
const style = ["borderStyle", "string"];
const color = ["borderColor", "color", "color"];
export const border = shorthandHandler([[width, style, color], [style, color], [width, style], [style]], []);
//# sourceMappingURL=border.js.map