// check for valid value of config.entity with optinal entity dommain check
import computeDomain from '../../../common/entity/compute_domain.js';

export default function validateEntityConfig(config, domain = null) {
  const entity = config && config.entity;

  if (!entity || typeof entity !== 'string') {
    return false;
  }

  if (domain) {
    return computeDomain(entity) === domain;
  }

  return true;
}
