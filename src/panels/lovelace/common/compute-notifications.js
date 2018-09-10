import computeDomain from '../../../common/entity/compute_domain.js';

const NOTIFICATION_DOMAINS = [
  'configurator'
];

export default function computeNotifications(states) {
  return Object.keys(states)
    .filter(entityId => NOTIFICATION_DOMAINS.includes(computeDomain(entityId)))
    .map(entityId => states[entityId]);
}
