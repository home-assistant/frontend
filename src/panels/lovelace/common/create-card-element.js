import computeDomain from '../../../common/entity/compute_domain.js';

import '../cards/hui-camera-preview-card.js';
import '../cards/hui-entities-card.js';
import '../cards/hui-entity-filter-card.js';
import '../cards/hui-glance-card';
import '../cards/hui-history-graph-card.js';
import '../cards/hui-markdown-card.js';
import '../cards/hui-media-control-card.js';
import '../cards/hui-entity-picture-card.js';
import '../cards/hui-picture-glance-card';
import '../cards/hui-plant-status-card.js';
import '../cards/hui-weather-forecast-card';
import '../cards/hui-error-card.js';

const CARD_TYPES = [
  'camera-preview',
  'entities',
  'entity-filter',
  'entity-picture',
  'glance',
  'history-graph',
  'markdown',
  'media-control',
  'picture-glance',
  'plant-status',
  'weather-forecast'
];

const DOMAIN_DEFAULT_CARD = {
  camera: 'camera-preview',
  history_graph: 'history-graph',
  media_player: 'media-control',
  plant: 'plant-status',
  weather: 'weather-forecast'
};

const CUSTOM_TYPE_PREFIX = 'custom:';

export default function createCardElement(config) {
  if (typeof config === 'string' && Object.keys(DOMAIN_DEFAULT_CARD).includes(computeDomain(config))) {
    const type = `hui-${DOMAIN_DEFAULT_CARD[computeDomain(config)]}-card`;
    const element = document.createElement(type);
    element.config = { type, entity: config };
    return element;
  }

  let error;
  let tag;
  if (config && config.type) {
    if (CARD_TYPES.includes(config.type)) {
      tag = `hui-${config.type}-card`;
    } else if (config.type.startsWith(CUSTOM_TYPE_PREFIX)) {
      tag = config.type.substr(CUSTOM_TYPE_PREFIX.length);
    }

    if (tag) {
      if (!customElements.get(tag)) {
        error = 'Custom element doesn\'t exist.';
      }
    } else {
      error = 'Unknown card type encountered.';
    }
  } else {
    error = 'No card type configured.';
  }

  let element;

  if (error) {
    element = document.createElement('hui-error-card');
    element.error = error;
  } else {
    element = document.createElement(tag);
  }
  element.config = config;
  return element;
}
