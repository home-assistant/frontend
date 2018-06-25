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
import '../cards/hui-iframe-card.js';

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

export default function computeCardElement(type) {
  if (CARD_TYPES.includes(type)) {
    return `hui-${type}-card`;
  } else if (type.startsWith(CUSTOM_TYPE_PREFIX)) {
    return type.substr(CUSTOM_TYPE_PREFIX.length);
  }
  return null;
}
