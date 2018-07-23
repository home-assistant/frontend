import fireEvent from '../../../common/dom/fire_event.js';

import '../entity-rows/hui-cover-entity-row.js';
import '../entity-rows/hui-input-number-entity-row.js';
import '../entity-rows/hui-input-select-entity-row.js';
import '../entity-rows/hui-input-text-entity-row.js';
import '../entity-rows/hui-lock-entity-row.js';
import '../entity-rows/hui-scene-entity-row.js';
import '../entity-rows/hui-script-entity-row.js';
import '../entity-rows/hui-text-entity-row.js';
import '../entity-rows/hui-timer-entity-row.js';
import '../entity-rows/hui-toggle-entity-row.js';

import createErrorCardConfig from './create-error-card-config.js';

const CUSTOM_TYPE_PREFIX = 'custom:';
const DOMAIN_TO_ELEMENT_TYPE = {
  automation: 'toggle',
  cover: 'cover',
  fan: 'toggle',
  group: 'toggle',
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

export default function createEntityRowElement(config) {
  let tag;

  if (!config || typeof config !== 'object' || !config.entity) {
    return _createErrorElement('Invalid config given.', config);
  }

  const type = config.type || 'default';
  if (type.startsWith(CUSTOM_TYPE_PREFIX)) {
    tag = type.substr(CUSTOM_TYPE_PREFIX.length);

    if (customElements.get(tag)) {
      return _createElement(tag, config);
    }
    const element = _createErrorElement(`Custom element doesn't exist: ${tag}.`, config);

    customElements.whenDefined(tag)
      .then(() => fireEvent(element, 'rebuild-view'));

    return element;
  }

  const domain = config.entity.split('.', 1)[0];
  tag = `hui-${DOMAIN_TO_ELEMENT_TYPE[domain] || 'text'}-entity-row`;

  return _createElement(tag, config);
}
