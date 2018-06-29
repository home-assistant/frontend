import '../../../cards/ha-camera-card.js';

import LegacyWrapperCard from './hui-legacy-wrapper-card.js';

class HuiCameraPreviewCard extends LegacyWrapperCard {
  constructor() {
    super('ha-camera-card', 'camera');
  }

  getCardSize() {
    return 4;
  }
}

customElements.define('hui-camera-preview-card', HuiCameraPreviewCard);
