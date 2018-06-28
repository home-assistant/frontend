/**
 * Check that all items in array are objects with an entity property containing a valid entity_id.
 *
 * Optionally provide an array of additional keys that must be present in every object
 */

import validEntityId from '../../../common/entity/valid_entity_id';

export default function validateEntitiesConfig(config, additionalKeys = []) {
  const entities = config && config.entities;

  if (!entities || !Array.isArray(entities)) {
    return false;
  }

  return entities.every(entity => entity && typeof entity === 'object' && !Array.isArray(entity) &&
    'entity' in entity && validEntityId(entity.entity) && additionalKeys.every(key => key in entity));
}
