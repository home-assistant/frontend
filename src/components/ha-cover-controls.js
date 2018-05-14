import '@polymer/paper-icon-button/paper-icon-button.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../util/cover-model.js';

class HaCoverControls extends PolymerElement {
  static get template() {
    return html`
    <style>
      .state {
        white-space: nowrap;
      }
      [invisible] {
        visibility: hidden !important;
      }
    </style>

    <div class="state">
      <paper-icon-button icon="mdi:arrow-up" on-click="onOpenTap" invisible\$="[[!entityObj.supportsOpen]]" disabled="[[computeOpenDisabled(stateObj, entityObj)]]"></paper-icon-button>
      <paper-icon-button icon="mdi:stop" on-click="onStopTap" invisible\$="[[!entityObj.supportsStop]]"></paper-icon-button>
      <paper-icon-button icon="mdi:arrow-down" on-click="onCloseTap" invisible\$="[[!entityObj.supportsClose]]" disabled="[[computeClosedDisabled(stateObj, entityObj)]]"></paper-icon-button>
    </div>
`;
  }

  static get is() { return 'ha-cover-controls'; }

  static get properties() {
    return {
      hass: {
        type: Object,
      },
      stateObj: {
        type: Object,
      },
      entityObj: {
        type: Object,
        computed: 'computeEntityObj(hass, stateObj)',
      },
    };
  }
  computeEntityObj(hass, stateObj) {
    return new window.CoverEntity(hass, stateObj);
  }
  computeOpenDisabled(stateObj, entityObj) {
    var assumedState = stateObj.attributes.assumed_state === true;
    return entityObj.isFullyOpen && !assumedState;
  }
  computeClosedDisabled(stateObj, entityObj) {
    var assumedState = (stateObj.attributes.assumed_state === true);
    return entityObj.isFullyClosed && !assumedState;
  }
  onOpenTap(ev) {
    ev.stopPropagation();
    this.entityObj.openCover();
  }
  onCloseTap(ev) {
    ev.stopPropagation();
    this.entityObj.closeCover();
  }
  onStopTap(ev) {
    ev.stopPropagation();
    this.entityObj.stopCover();
  }
}

customElements.define(HaCoverControls.is, HaCoverControls);
