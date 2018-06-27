import fireEvent from '../../../common/dom/fire_event.js';

import '../cards/hui-camera-preview-card.js';
import '../cards/hui-column-card.js';
import '../cards/hui-entities-card.js';
import '../cards/hui-entity-filter-card.js';
import '../cards/hui-glance-card';
import '../cards/hui-history-graph-card.js';
import '../cards/hui-iframe-card.js';
import '../cards/hui-markdown-card.js';
import '../cards/hui-media-control-card.js';
import '../cards/hui-entity-picture-card.js';
import '../cards/hui-picture-elements-card';
import '../cards/hui-picture-glance-card';
import '../cards/hui-plant-status-card.js';
import '../cards/hui-weather-forecast-card';
import '../cards/hui-error-card.js';

import createErrorCardConfig from './create-error-card-config.js';

const CARD_TYPES = [
  'camera-preview',
  'column',
  'entities',
  'entity-filter',
  'entity-picture',
  'error',
  'glance',
  'history-graph',
  'iframe',
  'markdown',
  'media-control',
  'picture-elements',
  'picture-glance',
  'plant-status',
  'weather-forecast'
];

const CUSTOM_TYPE_PREFIX = 'custom:';

function _createElement(tag, config) {
  const element = document.createElement(tag);
  element.config = config;
  return element;
}

function _createErrorElement(error, config) {
  return _createElement('hui-error-card', createErrorCardConfig(error, config));
}

export default function createCardElement(config) {
  let tag;

  if (!config || typeof config !== 'object' || !config.type) {
    return _createErrorElement('No card type configured.', config);
  }

  if (config.type.startsWith(CUSTOM_TYPE_PREFIX)) {
    tag = config.type.substr(CUSTOM_TYPE_PREFIX.length);

    if (customElements.get(tag)) {
      return _createElement(tag, config);
    }

    const element = _createErrorElement(`Custom element doesn't exist: ${tag}.`, config);

    customElements.whenDefined(tag)
      .then(() => fireEvent(element, 'rebuild-view'));

    return element;
  }

  if (!CARD_TYPES.includes(config.type)) {
    return _createErrorElement(`Unknown card type encountered: ${config.type}.`, config);
  }

  return _createElement(`hui-${config.type}-card`, config);
}
