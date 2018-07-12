export default function callService(hass, domainService, serviceData = {}) {
  const [domain, service] = domainService.split('.', 2);
  hass.callService(domain, service, serviceData);
}
