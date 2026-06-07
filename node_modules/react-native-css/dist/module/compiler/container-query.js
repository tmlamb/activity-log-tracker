"use strict";

/* eslint-disable */

import { parseMediaFeatureOperator, parseMediaFeatureValue } from "./media-query.js";
export function parseContainerCondition(condition, builder) {
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
      return ["=", feature.name, parseMediaFeatureValue(feature.value, builder)];
    case "range":
      return [parseMediaFeatureOperator(feature.operator), feature.name, parseMediaFeatureValue(feature.value, builder)];
    case "interval":
      return ["[]", feature.name, parseMediaFeatureValue(feature.start, builder), parseMediaFeatureOperator(feature.startOperator), parseMediaFeatureValue(feature.end, builder), parseMediaFeatureOperator(feature.endOperator)];
    default:
      feature;
      return;
  }
}
//# sourceMappingURL=container-query.js.map