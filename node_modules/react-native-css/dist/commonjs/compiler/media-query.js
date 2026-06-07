"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseMediaFeatureOperator = parseMediaFeatureOperator;
exports.parseMediaFeatureValue = parseMediaFeatureValue;
exports.parseMediaQuery = parseMediaQuery;
var _declarations = require("./declarations.js");
/* eslint-disable */

function parseMediaQuery(query, builder) {
  let platformCondition;
  let condition;
  if (query.mediaType) {
    // Print is for printing documents
    if (query.mediaType === "print") {
      return;
    }

    // These all/screen are not conditions, they always apply
    if (query.mediaType !== "all" && query.mediaType !== "screen") {
      platformCondition = ["=", "platform", query.mediaType];
    }
  }
  if (query.condition) {
    condition = parseMediaQueryCondition(query.condition, builder);

    // If any of these are undefined, the media query is invalid
    if (!condition || condition.some(v => v === undefined)) {
      return;
    }
  }
  let mediaQuery = platformCondition && condition ? ["&", [platformCondition, condition]] : platformCondition || condition;
  if (!mediaQuery) {
    return;
  }
  if (query.qualifier === "not") {
    mediaQuery = ["!", mediaQuery];
  }
  builder.addMediaQuery(mediaQuery);
}
function parseMediaQueryCondition(query, builder) {
  switch (query.type) {
    case "feature":
      return parseFeature(query.value, builder);
    case "not":
      const mediaQuery = parseMediaQueryCondition(query.value, builder);
      return mediaQuery ? ["!", mediaQuery] : undefined;
    case "operation":
      const mediaQueries = query.conditions.map(c => parseMediaQueryCondition(c, builder)).filter(v => !!v);
      if (mediaQueries.length === 0) {
        return;
      }
      switch (query.operator) {
        case "and":
          return ["&", mediaQueries];
        case "or":
          return ["|", mediaQueries];
        default:
          query.operator;
          return;
      }
    default:
      query;
  }
  return;
}
function parseFeature(feature, builder) {
  switch (feature.type) {
    case "boolean":
      return ["!!", feature.name];
    case "plain":
      return ["=", feature.name, parseMediaFeatureValue(feature.value, builder)];
    case "range":
      return [parseMediaFeatureOperator(feature.operator), feature.name, parseMediaFeatureValue(feature.value, builder)];
    case "interval":
      return ["[]", feature.name, parseMediaFeatureValue(feature.start, builder), parseMediaFeatureOperator(feature.startOperator), parseMediaFeatureValue(feature.end, builder), parseMediaFeatureOperator(feature.endOperator)];
    default:
      feature;
  }
  return;
}
function parseMediaFeatureValue(value, builder) {
  switch (value.type) {
    case "boolean":
    case "ident":
    case "integer":
    case "number":
      return value.value;
    case "length":
      switch (value.value.type) {
        case "value":
          return (0, _declarations.parseLength)(value.value.value, builder);
        case "calc":
          return parseCalcFn(value.value.value, builder);
        default:
          value.value;
          return;
      }
    case "resolution":
      switch (value.value.type) {
        case "dpi":
          // Mobile devices use 160 as a standard
          return value.value.value / 160;
        case "dpcm":
          // There are 1in = ~2.54cm
          return value.value.value / (160 * 2.54);
        case "dppx":
          return value.value.value;
        default:
          value.value;
          return undefined;
      }
    case "ratio":
    case "env":
  }
  return;
}
function parseMediaFeatureOperator(operator) {
  switch (operator) {
    case "equal":
      return "=";
    case "greater-than":
      return ">";
    case "greater-than-equal":
      return ">=";
    case "less-than":
      return "<";
    case "less-than-equal":
      return "<=";
    default:
      operator;
      throw new Error(`Unknown MediaFeatureComparison operator ${operator}`);
  }
}
function parseCalcFn(calc, builder) {
  switch (calc.type) {
    case "number":
      return calc.value;
    case "value":
      return (0, _declarations.parseLength)(calc.value, builder);
    case "sum":
      return [{}, "sum", calc.value.map(c => parseCalcFn(c, builder))];
    case "product":
      return [{}, "product", [calc.value[0], parseCalcFn(calc.value[1], builder)]];
    case "function":
      switch (calc.value.type) {
        case "calc":
          return parseCalcFn(calc.value.value, builder);
        case "min":
        case "max":
        case "clamp":
        case "rem":
        case "mod":
        case "hypot":
          return [{}, calc.value.type, calc.value.value.map(c => parseCalcFn(c, builder))];
        case "abs":
        case "sign":
          return [{}, calc.value.type, [parseCalcFn(calc.value.value, builder)]];
        case "round":
          return [{}, calc.value.type, [calc.value.value[0], parseCalcFn(calc.value.value[1], builder), parseCalcFn(calc.value.value[2], builder)]];
        default:
          calc.value;
          return;
      }
    default:
      calc;
  }
  return;
}
//# sourceMappingURL=media-query.js.map