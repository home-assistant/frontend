export default function canToggleDomain(hass, domain) {
  const services = hass.config.services[domain];
  if (!services) { return false; }

  if (domain === 'lock') {
    return 'lock' in services;
  } else if (domain === 'cover') {
    return 'open_cover' in services;
  }
  return 'turn_on' in services;
}
