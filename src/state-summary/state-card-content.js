import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import './state-card-climate.js';
import './state-card-configurator.js';
import './state-card-cover.js';
import './state-card-display.js';
import './state-card-input_select.js';
import './state-card-input_number.js';
import './state-card-input_text.js';
import './state-card-media_player.js';
import './state-card-scene.js';
import './state-card-script.js';
import './state-card-timer.js';
import './state-card-toggle.js';
import './state-card-weblink.js';
import '../util/hass-util.js';
class StateCardContent extends PolymerElement {
  static get is() { return 'state-card-content'; }

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
    let stateCardType;
    if (!stateObj || !hass) return;
    if (stateObj.attributes && 'custom_ui_state_card' in stateObj.attributes) {
      stateCardType = stateObj.attributes.custom_ui_state_card;
    } else {
      stateCardType = 'state-card-' + window.hassUtil.stateCardType(hass, stateObj);
    }
    window.hassUtil.dynamicContentUpdater(
      this,
      stateCardType.toUpperCase(),
      {
        hass: hass,
        stateObj: stateObj,
        inDialog: inDialog,
      }
    );
  }
}
customElements.define(StateCardContent.is, StateCardContent);
