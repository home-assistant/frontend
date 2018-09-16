import fireEvent from '../../../common/dom/fire_event.js';

import '../entity-rows/hui-climate-entity-row.js';
import '../entity-rows/hui-cover-entity-row.js';
import '../entity-rows/hui-group-entity-row.js';
import '../entity-rows/hui-input-number-entity-row.js';
import '../entity-rows/hui-input-select-entity-row.js';
import '../entity-rows/hui-input-text-entity-row.js';
import '../entity-rows/hui-lock-entity-row.js';
import '../entity-rows/hui-scene-entity-row.js';
import '../entity-rows/hui-script-entity-row.js';
import '../entity-rows/hui-text-entity-row.js';
import '../entity-rows/hui-timer-entity-row.js';
import '../entity-rows/hui-toggle-entity-row.js';

import '../special-rows/hui-call-service-row.js';
import '../special-rows/hui-divider-row.js';
import '../special-rows/hui-weblink-row.js';

import createErrorCardConfig from './create-error-card-config.js';

const CUSTOM_TYPE_PREFIX = 'custom:';
const SPECIAL_TYPES = new Set([
  'call-service',
  'divider',
  'weblink'
]);
const DOMAIN_TO_ELEMENT_TYPE = {
  automation: 'toggle',
  climate: 'climate',
  cover: 'cover',
  fan: 'toggle',
  group: 'group',
  input_boolean: 'toggle',
  input_number: 'input-number',
  input_select: 'input-select',
  input_text: 'input-text',
  light: 'toggle',
  lock: 'lock',
  scene: 'scene',
  script: 'script',
  timer: 'timer',
  switch: 'toggle',
  vacuum: 'toggle'
};

function _createElement(tag, config) {
  const element = document.createElement(tag);
  try {
    if ('setConfig' in element) element.setConfig(config);
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

export default function createRowElement(config) {
  if (!config || typeof config !== 'object' || (!config.entity && !config.type)) {
    return _createErrorElement('Invalid config given.', config);
  }

  const type = config.type || 'default';
  if (SPECIAL_TYPES.has(type)) {
    return _createElement(`hui-${type}-row`, config);
  }

  const domain = config.entity.split('.', 1)[0];
  const tag = `hui-${DOMAIN_TO_ELEMENT_TYPE[domain] || 'text'}-entity-row`;

  if (type.startsWith(CUSTOM_TYPE_PREFIX)) {
    const customTag = type.substr(CUSTOM_TYPE_PREFIX.length);

    if (customElements.get(customTag)) {
      return _createElement(customTag, config);
    }
    const element = _createElement(tag, config);

    customElements.whenDefined(customTag)
      .then(() => fireEvent(element, 'rebuild-view'));

    return element;
  }

  return _createElement(tag, config);
}
