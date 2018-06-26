import '../cards/hui-camera-preview-card.js';
import '../cards/hui-entities-card.js';
import '../cards/hui-entity-filter-card.js';
import '../cards/hui-glance-card';
import '../cards/hui-history-graph-card.js';
import '../cards/hui-iframe-card.js';
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
  'iframe',
  'markdown',
  'media-control',
  'picture-glance',
  'plant-status',
  'weather-forecast'
];

const CUSTOM_TYPE_PREFIX = 'custom:';

export default function
createCardElement(config, elementNotDefinedCallback = null, invalidConfig = null) {
  let error = invalidConfig;
  let tag;

  if (!error && config && typeof config === 'object' && config.type) {
    if (CARD_TYPES.includes(config.type)) {
      tag = `hui-${config.type}-card`;
    } else if (config.type.startsWith(CUSTOM_TYPE_PREFIX)) {
      tag = config.type.substr(CUSTOM_TYPE_PREFIX.length);
    }

    if (tag) {
      if (!customElements.get(tag)) {
        error = 'Custom element doesn\'t exist.';
        if (elementNotDefinedCallback) elementNotDefinedCallback(tag);
      }
    } else {
      error = 'Unknown card type encountered.';
    }
  } else {
    error = 'No card type configured.';
  }

  if (error) tag = 'hui-error-card';
  const element = document.createElement(tag);
  if (error) element.error = error;
  element.config = config;
  return element;
}
