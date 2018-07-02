import fireEvent from '../../../common/dom/fire_event.js';

import '../cards/hui-camera-preview-card.js';
import '../cards/hui-entities-card.js';
import '../cards/hui-entity-filter-card.js';
import '../cards/hui-error-card.js';
import '../cards/hui-glance-card';
import '../cards/hui-history-graph-card.js';
import '../cards/hui-horizontal-stack-card.js';
import '../cards/hui-iframe-card.js';
import '../cards/hui-markdown-card.js';
import '../cards/hui-media-control-card.js';
import '../cards/hui-picture-card.js';
import '../cards/hui-picture-elements-card';
import '../cards/hui-picture-entity-card';
import '../cards/hui-picture-glance-card';
import '../cards/hui-plant-status-card.js';
import '../cards/hui-vertical-stack-card.js';
import '../cards/hui-weather-forecast-card';

import createErrorCardConfig from './create-error-card-config.js';

const CARD_TYPES = [
  'camera-preview',
  'entities',
  'entity-filter',
  'error',
  'glance',
  'history-graph',
  'horizontal-stack',
  'iframe',
  'markdown',
  'media-control',
  'picture',
  'picture-elements',
  'picture-entity',
  'picture-glance',
  'plant-status',
  'vertical-stack',
  'weather-forecast'
];

const CUSTOM_TYPE_PREFIX = 'custom:';

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
