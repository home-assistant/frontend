import { HomeAssistant } from "../../../types";
import { CallServiceConfig } from "../entity-rows/types";

export const callService = (
  config: CallServiceConfig,
  hass: HomeAssistant
): void => {
  const entityId = config.entity;
  const [domain, service] = config.service.split(".", 2);
  const serviceData = { entity_id: entityId, ...config.service_data };
  hass.callService(domain, service, serviceData);
};
