import '../elements/hui-icon-element.js';
import '../elements/hui-image-element.js';
import '../elements/hui-service-button-element.js';
import '../elements/hui-state-badge-element.js';
import '../elements/hui-state-icon-element.js';
import '../elements/hui-state-label-element.js';

import fireEvent from '../../../common/dom/fire_event.js';
import createErrorCardConfig from './create-error-card-config.js';

const CUSTOM_TYPE_PREFIX = 'custom:';
const ELEMENT_TYPES = new Set([
  'icon',
  'image',
  'service-button',
  'state-badge',
  'state-icon',
  'state-label',
]);

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

export default function createHuiElement(config) {
  if (!config || typeof config !== 'object' || !config.type) {
    return _createErrorElement('No element type configured.', config);
  }

  if (config.type.startsWith(CUSTOM_TYPE_PREFIX)) {
    const tag = config.type.substr(CUSTOM_TYPE_PREFIX.length);

    if (customElements.get(tag)) {
      const el = _createElement(tag, config);
      el.isHuiElement = true;
      return el;
    }

    const element = _createErrorElement(`Custom element doesn't exist: ${tag}.`, config);

    customElements.whenDefined(tag)
      .then(() => fireEvent(element, 'rebuild-view'));

    return element;
  }

  if (!ELEMENT_TYPES.has(config.type)) {
    return _createErrorElement(`Unknown element type encountered: ${config.type}.`, config);
  }

  return _createElement(`hui-${config.type}-element`, config);
}
