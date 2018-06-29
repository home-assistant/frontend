// check for valid value of config.entity with optinal entity dommain check
import computeDomain from '../../../common/entity/compute_domain.js';
import validEntityId from '../../../common/entity/valid_entity_id';

export default function validateEntityConfig(config, domain = null) {
  const entityId = config && config.entity;

  if (!entityId || typeof entityId !== 'string' || !validEntityId(entityId)) {
    return false;
  }

  if (domain) {
    return computeDomain(entityId) === domain;
  }

  return true;
}
