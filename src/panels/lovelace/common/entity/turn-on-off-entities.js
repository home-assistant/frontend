import { STATES_OFF } from '../../../../common/const.js';
import computeDomain from '../../../../common/entity/compute_domain.js';

export default function turnOnOffEntities(hass, entityIds, turnOn = true) {
  const domainsToCall = {};
  entityIds.forEach((entityId) => {
    if ((STATES_OFF.includes(hass.states[entityId].state)) === turnOn) {
      const stateDomain = computeDomain(entityId);
      const serviceDomain = ['cover', 'lock'].includes(stateDomain) ?
        stateDomain : 'homeassistant';

      if (!(serviceDomain in domainsToCall)) domainsToCall[serviceDomain] = [];
      domainsToCall[serviceDomain].push(entityId);
    }
  });

  Object.keys(domainsToCall).forEach((domain) => {
    let service;
    switch (domain) {
      case 'lock':
        service = turnOn ? 'unlock' : 'lock';
        break;
      case 'cover':
        service = turnOn ? 'open_cover' : 'close_cover';
        break;
      default:
        service = turnOn ? 'turn_on' : 'turn_off';
    }

    const entities = domainsToCall[domain];
    hass.callService(domain, service, { entity_id: entities });
  });
}
