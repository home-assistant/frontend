import { STRINGS_SEPARATOR_DOT } from "../../common/const";
import { computeDomain } from "../../common/entity/compute_domain";
import { stringCompare } from "../../common/string/compare";
import type { LocalizeFunc } from "../../common/translations/localize";
import type { HomeAssistant } from "../../types";
import { DOMAIN_DEVICE_CLASSES } from "../device_classes";
import { domainToName } from "../integration";
import { computeDeviceClassName, NO_DEVICE_CLASS } from "./device_class";

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

// By default, a domain worth no split maps to an empty list rather than to its
// lone bucket.
export const usedEntityTypes = (
  states: HomeAssistant["states"],
  collapseSingleClass = true
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
      classes.size > 1 || !collapseSingleClass ? [...classes] : [],
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

// Core picks this one from the battery level, so it has no usable default.
export const FIXED_ENTITY_TYPE_ICONS: Record<string, string> = {
  "sensor/battery": "mdi:battery",
};

export const computeEntityTypeDeviceClassName = (
  localize: LocalizeFunc,
  domain: string,
  deviceClass: string
): string =>
  deviceClass === NO_DEVICE_CLASS
    ? localize("ui.components.filter-entity-types.no_device_class")
    : computeDeviceClassName(localize, domain, deviceClass);

export const sortDeviceClasses = (
  localize: LocalizeFunc,
  domain: string,
  deviceClasses: string[],
  language?: string
): { deviceClass: string; name: string }[] =>
  deviceClasses
    .map((deviceClass) => ({
      deviceClass,
      name: computeEntityTypeDeviceClassName(localize, domain, deviceClass),
    }))
    .sort((a, b) => {
      if (a.deviceClass === NO_DEVICE_CLASS) {
        return 1;
      }
      if (b.deviceClass === NO_DEVICE_CLASS) {
        return -1;
      }
      return stringCompare(a.name, b.name, language);
    });

const computeEntityTypeFullName = (
  localize: LocalizeFunc,
  key: string
): string => {
  const { domain, deviceClass } = parseEntityType(key);
  const domainName = domainToName(localize, domain);
  if (!deviceClass) {
    return domainName;
  }
  return [
    domainName,
    computeEntityTypeDeviceClassName(localize, domain, deviceClass),
  ].join(STRINGS_SEPARATOR_DOT);
};

// A device class is named on its own unless another type in the list has the
// same name, or it is the "no type" bucket, which means nothing without its
// domain.
export const computeEntityTypeNames = (
  localize: LocalizeFunc,
  keys: string[]
): Map<string, string> => {
  const shortNames = keys.map((key) => {
    const { domain, deviceClass } = parseEntityType(key);
    return deviceClass
      ? computeEntityTypeDeviceClassName(localize, domain, deviceClass)
      : domainToName(localize, domain);
  });
  return new Map(
    keys.map((key, index) => {
      const name = shortNames[index];
      const isDuplicate =
        shortNames.indexOf(name) !== shortNames.lastIndexOf(name);
      const needsDomain =
        isDuplicate || parseEntityType(key).deviceClass === NO_DEVICE_CLASS;
      return [
        key,
        needsDomain ? computeEntityTypeFullName(localize, key) : name,
      ];
    })
  );
};
