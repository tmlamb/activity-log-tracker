"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.parseContainerCondition = parseContainerCondition;
var _mediaQuery = require("./media-query.js");
/* eslint-disable */

function parseContainerCondition(condition, builder) {
  let containerQuery = parseContainerQueryCondition(condition, builder);

  // If any of these are undefined, the media query is invalid
  if (!containerQuery || containerQuery.some(v => v === undefined)) {
    return;
  }
  return containerQuery;
}
function parseContainerQueryCondition(condition, builder) {
  switch (condition.type) {
    case "feature":
      return parseFeature(condition.value, builder);
    case "not":
      const query = parseContainerCondition(condition.value, builder);
      return query ? ["!", query] : undefined;
    case "operation":
      const conditions = condition.conditions.map(c => parseContainerQueryCondition(c, builder)).filter(v => !!v);
      if (conditions.length === 0) {
        return;
      }
      switch (condition.operator) {
        case "and":
          return ["&", conditions];
        case "or":
          return ["|", conditions];
        default:
          condition.operator;
          return;
      }
    case "style":
      // We don't support these yet
      return;
    default:
      condition;
      return;
  }
}
function parseFeature(feature, builder) {
  switch (feature.type) {
    case "boolean":
      return ["!!", feature.name];
    case "plain":
      return ["=", feature.name, (0, _mediaQuery.parseMediaFeatureValue)(feature.value, builder)];
    case "range":
      return [(0, _mediaQuery.parseMediaFeatureOperator)(feature.operator), feature.name, (0, _mediaQuery.parseMediaFeatureValue)(feature.value, builder)];
    case "interval":
      return ["[]", feature.name, (0, _mediaQuery.parseMediaFeatureValue)(feature.start, builder), (0, _mediaQuery.parseMediaFeatureOperator)(feature.startOperator), (0, _mediaQuery.parseMediaFeatureValue)(feature.end, builder), (0, _mediaQuery.parseMediaFeatureOperator)(feature.endOperator)];
    default:
      feature;
      return;
  }
}
//# sourceMappingURL=container-query.js.map