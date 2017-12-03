export default function canToggleDomain(hass, domain) {
  const services = hass.config.services[domain];

  let turnOnService;
  if (domain === 'lock') {
    turnOnService = 'lock';
  } else if (domain === 'cover') {
    turnOnService = 'open_cover';
  } else {
    turnOnService = 'turn_on';
  }

  return services && turnOnService in services;
}
