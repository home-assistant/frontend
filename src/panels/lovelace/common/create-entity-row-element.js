import fireEvent from '../../../common/dom/fire_event.js';

import stateCardType from '../../../common/entity/state_card_type.js';
import computeDomain from '../../../common/entity/compute_domain.js';
import { DOMAINS_HIDE_MORE_INFO } from '../../../common/const.js';

import createErrorCardConfig from './create-error-card-config.js';

const CUSTOM_TYPE_PREFIX = 'custom:';

function _createElement(tag, config, stateObj, hass) {
  const element = document.createElement(tag);
  try {
    if ('setConfig' in element) element.setConfig(config);
  } catch (err) {
    // eslint-disable-next-line
    console.error(tag, err);
    // eslint-disable-next-line
    return _createErrorElement(err.message, config);
  }

  const entityId = config.entity;
  if (entityId && !DOMAINS_HIDE_MORE_INFO.includes(computeDomain(entityId))) {
    element.classList.add('state-card-dialog');
    element.addEventListener('click', () => this.fire('hass-more-info', { entityId }));
  }
  element.stateObj = stateObj;
  element.hass = hass;
  if (config.name) {
    element.overrideName = config.name;
  }

  return element;
}

function _createErrorElement(error, config) {
  return _createElement('hui-error-card', createErrorCardConfig(error, config));
}

export default function createEntityRowElement(config, hass) {
  let tag;

  if (!config || typeof config !== 'object') {
    return _createErrorElement('Invalid config given.', config);
  }

  const entityId = config.entity;
  if (!(entityId in hass.states)) {
    return _createErrorElement('Entity not found.', config);
  }

  const type = config.type || 'default';
  const stateObj = hass.states[entityId];
  if (type.startsWith(CUSTOM_TYPE_PREFIX)) {
    tag = type.substr(CUSTOM_TYPE_PREFIX.length);

    if (customElements.get(tag)) {
      return _createElement(tag, config, stateObj, hass);
    }
    const element = _createErrorElement(`Custom element doesn't exist: ${tag}.`, config);

    customElements.whenDefined(tag)
      .then(() => fireEvent(element, 'rebuild-view'));

    return element;
  }

  tag = stateObj ? `state-card-${stateCardType(hass, stateObj)}` : 'state-card-display';

  return _createElement(tag, config, stateObj, hass);
}
