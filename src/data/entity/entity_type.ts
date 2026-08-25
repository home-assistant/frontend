import { computeDomain } from "../../common/entity/compute_domain";
import type { HomeAssistant } from "../../types";
import { DOMAIN_DEVICE_CLASSES, NO_DEVICE_CLASS } from "./device_class";

const SEPARATOR = "/";

export interface EntityType {
  domain: string;
  deviceClass?: string;
}

export const entityTypeKey = (domain: string, deviceClass?: string): string =>
  deviceClass ? `${domain}${SEPARATOR}${deviceClass}` : domain;

export const parseEntityType = (key: string): EntityType => {
  const index = key.indexOf(SEPARATOR);
  return index === -1
    ? { domain: key }
    : {
        domain: key.slice(0, index),
        deviceClass: key.slice(index + SEPARATOR.length),
      };
};

export const entityTypesNeedStates = (types?: string[]): boolean =>
  !!types?.some((key) => key.includes(SEPARATOR));

// A domain worth no split maps to an empty list rather than to its lone bucket.
export const usedEntityTypes = (
  states: HomeAssistant["states"]
): Map<string, string[]> => {
  const byDomain = new Map<string, Set<string>>();

  for (const stateObj of Object.values(states)) {
    const domain = computeDomain(stateObj.entity_id);
    let classes = byDomain.get(domain);
    if (!classes) {
      classes = new Set();
      byDomain.set(domain, classes);
    }
    if (domain in DOMAIN_DEVICE_CLASSES) {
      classes.add(stateObj.attributes.device_class || NO_DEVICE_CLASS);
    }
  }

  return new Map(
    [...byDomain].map(([domain, classes]) => [
      domain,
      classes.size > 1 ? [...classes] : [],
    ])
  );
};

// Relies on a domain and its device classes never being selected at once.
export const entityTypeFilterFunc = (
  types: string[],
  states: HomeAssistant["states"]
): ((entityId: string) => boolean) => {
  const domains = new Set<string>();
  const deviceClasses = new Map<string, Set<string>>();

  for (const key of types) {
    const { domain, deviceClass } = parseEntityType(key);
    if (deviceClass === undefined) {
      domains.add(domain);
    } else {
      let classes = deviceClasses.get(domain);
      if (!classes) {
        classes = new Set();
        deviceClasses.set(domain, classes);
      }
      classes.add(deviceClass);
    }
  }

  return (entityId: string) => {
    const domain = computeDomain(entityId);
    if (domains.has(domain)) {
      return true;
    }
    const classes = deviceClasses.get(domain);
    if (!classes) {
      return false;
    }
    const stateObj = states[entityId];
    if (!stateObj) {
      return false;
    }
    return classes.has(stateObj.attributes.device_class || NO_DEVICE_CLASS);
  };
};
