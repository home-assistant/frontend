import { computeDomain } from "../common/entity/compute_domain";
import { computeObjectId } from "../common/entity/compute_object_id";
import type { LocalizeFunc } from "../common/translations/localize";
import { DEFAULT_SERVICE_ICON } from "./icons";
import type { HomeAssistant } from "../types";

export interface ServiceInfo {
  label: string;
  icon?: string;
  iconPath: string;
}

export const DEFAULT_SERVICE_INFO: ServiceInfo = {
  label: "",
  iconPath: DEFAULT_SERVICE_ICON,
};

export const computeServiceLabel = (
  localize: LocalizeFunc,
  services: HomeAssistant["services"],
  service: string
): string => {
  const domain = computeDomain(service);
  const serviceName = computeObjectId(service);
  const serviceDef = services[domain]?.[serviceName];
  return (
    localize(
      `component.${domain}.services.${serviceName}.name`,
      serviceDef?.description_placeholders
    ) ||
    serviceDef?.name ||
    service
  );
};
