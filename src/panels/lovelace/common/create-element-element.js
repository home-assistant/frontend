import '../elements/hui-icon-element.js';
import '../elements/hui-image-element.js';
import '../elements/hui-service-button-element.js';
import '../elements/hui-state-badge-element.js';
import '../elements/hui-state-icon-element.js';
import '../elements/hui-state-label-element.js';

import createErrorCardConfig from './create-error-card-config.js';

export const ELEMENT_TYPES = [
  'icon',
  'image',
  'service-button',
  'state-badge',
  'state-icon',
  'state-label',
];

function _createElement(tag, config) {
  const element = document.createElement(tag);
  try {
    element.setConfig(config);
  } catch (err) {
    // eslint-disable-next-line
    console.error(tag, err);
    // eslint-disable-next-line
    return _createErrorElement(err.message, config);
  }
  return element;
}

function _createErrorElement(error, config) {
  return _createElement('hui-error-card', createErrorCardConfig(error, config));
}

export default function createElementElement(config) {
  if (!config || typeof config !== 'object' || !config.type) {
    return _createErrorElement('No card type configured.', config);
  }

  if (!ELEMENT_TYPES.includes(config.type)) {
    return _createErrorElement(`Unknown card type encountered: ${config.type}.`, config);
  }

  return _createElement(`hui-${config.type}-element`, config);
}
