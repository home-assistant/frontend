import computeStateDomain from './compute_state_domain.js';
import { HIDE_MORE_INFO, DOMAINS_WITH_MORE_INFO } from '../const.js';

export default function stateMoreInfoType(stateObj) {
  const domain = computeStateDomain(stateObj);

  if (DOMAINS_WITH_MORE_INFO.includes(domain)) {
    return domain;
  }
  if (HIDE_MORE_INFO.includes(domain)) {
    return 'hidden';
  }
  return 'default';
}
