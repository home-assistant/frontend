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
 * The key of the category an element belongs to, worked out from the element
 * itself rather than from the way the user reached it — an element can be
 * added from a category, from a target, or straight out of the search box, and
 * only the first of those knows which category it came from.
 *
 * The answer is a key, not a promise that the category is on screen: an install
 * without the integration behind it renders no such group. Callers resolve it
 * against what they actually rendered.
 */
export const findElementGroupKey = (
  type: "trigger" | "condition" | "action",
  collections: AutomationElementGroupCollection[],
  key: string
): string => {
  // Elements that come from the backend carry the dynamic prefix on their key
  // ("__DYNAMIC__sun.sunrise"); the domain is in what it prefixes.
  const value = isDynamic(key) ? getValueFromDynamic(key) : key;

  const domain =
    type === "trigger"
      ? getTriggerDomain(value)
      : type === "condition"
        ? getConditionDomain(value)
        : computeDomain(value);

  // A curated group either names the element among its members or claims the
  // whole domain it comes from.
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

  // Otherwise it belongs to one of the domain groups the dynamic and
  // integration sections generate.
  return `${DYNAMIC_PREFIX}${domain}`;
};
