import { HomeAssistant } from "../../../types";

export const callService = (config: any, hass: HomeAssistant): void => {
  const entityId = config.entity;
  const [domain, service] = config.service.split(".", 2);
  const serviceData = { entity_id: entityId, ...config.service_data };
  hass.callService(domain, service, serviceData);
};
