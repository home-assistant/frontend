import { computeDomain } from "../../../../common/entity/compute_domain";
import type { AutomationElementGroupCollection } from "../../../../data/automation";
import {
  DYNAMIC_PREFIX,
  getValueFromDynamic,
  isDynamic,
} from "../../../../data/automation";
import { getConditionDomain } from "../../../../data/condition";
import { getTriggerDomain } from "../../../../data/trigger";

/**
 * Find the key of the group an element belongs to, independent of how it was
 * reached (category, target or search). The group may not be rendered, for
 * example when the integration behind it is not set up.
 */
export const findElementGroupKey = (
  type: "trigger" | "condition" | "action",
  collections: AutomationElementGroupCollection[],
  key: string
): string => {
  const value = isDynamic(key) ? getValueFromDynamic(key) : key;

  const domain =
    type === "trigger"
      ? getTriggerDomain(value)
      : type === "condition"
        ? getConditionDomain(value)
        : computeDomain(value);

  for (const collection of collections) {
    for (const [groupKey, options] of Object.entries(collection.groups)) {
      if (
        (options.members && value in options.members) ||
        options.domains?.includes(domain)
      ) {
        return groupKey;
      }
    }
  }

  return `${DYNAMIC_PREFIX}${domain}`;
};
