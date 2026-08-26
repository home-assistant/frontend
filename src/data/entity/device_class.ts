import type { LocalizeFunc } from "../../common/translations/localize";

export const NO_DEVICE_CLASS = "none";

export const computeDeviceClassName = (
  localize: LocalizeFunc,
  domain: string,
  deviceClass: string
): string =>
  localize(`component.${domain}.entity_component.${deviceClass}.name`) ||
  deviceClass;
