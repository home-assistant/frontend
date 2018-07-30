import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import './state-card-climate.js';
import './state-card-configurator.js';
import './state-card-cover.js';
import './state-card-display.js';
import './state-card-input_number.js';
import './state-card-input_select.js';
import './state-card-input_text.js';
import './state-card-lock.js';
import './state-card-media_player.js';
import './state-card-scene.js';
import './state-card-script.js';
import './state-card-sous_vide.js';
import './state-card-timer.js';
import './state-card-toggle.js';
import './state-card-vacuum.js';
import './state-card-weblink.js';

import stateCardType from '../common/entity/state_card_type.js';
import dynamicContentUpdater from '../common/dom/dynamic_content_updater.js';

class StateCardContent extends PolymerElement {
  static get properties() {
    return {
      hass: Object,
      stateObj: Object,
      inDialog: {
        type: Boolean,
        value: false,
      },
    };
  }

  static get observers() {
    return [
      'inputChanged(hass, inDialog, stateObj)',
    ];
  }

  inputChanged(hass, inDialog, stateObj) {
    let stateCard;
    if (!stateObj || !hass) return;
    if (stateObj.attributes && 'custom_ui_state_card' in stateObj.attributes) {
      stateCard = stateObj.attributes.custom_ui_state_card;
    } else {
      stateCard = 'state-card-' + stateCardType(hass, stateObj);
    }
    dynamicContentUpdater(
      this,
      stateCard.toUpperCase(),
      {
        hass: hass,
        stateObj: stateObj,
        inDialog: inDialog,
      }
    );
  }
}
customElements.define('state-card-content', StateCardContent);
