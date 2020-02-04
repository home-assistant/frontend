import { HomeAssistant } from "../../../types";
import { ButtonRowConfig } from "../entity-rows/types";

export const callService = (
  config: ButtonRowConfig,
  hass: HomeAssistant
): void => {
  const entityId = config.entity;
  const [domain, service] = config.service.split(".", 2);
  const serviceData = { entity_id: entityId, ...config.service_data };
  hass.callService(domain, service, serviceData);
};
