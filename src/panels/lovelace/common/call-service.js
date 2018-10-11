export default function callService(config, hass) {
  const entityId = config.entity;
  const [domain, service] = config.service.split(".", 2);
  const serviceData = Object.assign(
    {},
    { entity_id: entityId },
    config.service_data
  );
  hass.callService(domain, service, serviceData);
}
