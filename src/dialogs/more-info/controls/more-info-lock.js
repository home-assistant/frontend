import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-input/paper-input.js';
import '../../../components/ha-attributes.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

class MoreInfoLock extends PolymerElement {
  static get template() {
    return html`
    <style>
      paper-input {
        display: inline-block;
      }
    </style>

    <div hidden\$="[[!stateObj.attributes.code_format]]">
      <paper-input label="code" value="{{enteredCode}}" pattern="[[stateObj.attributes.code_format]]" type="password"></paper-input>
      <paper-button on-click="handleUnlockTap" hidden\$="[[!isLocked]]">Unlock</paper-button>
      <paper-button on-click="handleLockTap" hidden\$="[[isLocked]]">Lock</paper-button>
    </div>
    <ha-attributes state-obj="[[stateObj]]" extra-filters="code_format"></ha-attributes>
`;
  }

  static get is() { return 'more-info-lock'; }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      stateObj: {
        type: Object,
        observer: 'stateObjChanged',
      },
      enteredCode: {
        type: String,
        value: '',
      },
      isLocked: Boolean,
    };
  }

  handleUnlockTap() {
    this.callService('unlock', { code: this.enteredCode });
  }

  handleLockTap() {
    this.callService('lock', { code: this.enteredCode });
  }

  stateObjChanged(newVal) {
    if (newVal) {
      this.isLocked = newVal.state === 'locked';
    }
  }

  callService(service, data) {
    var serviceData = data || {};
    serviceData.entity_id = this.stateObj.entity_id;
    this.hass.callService('lock', service, serviceData);
  }
}

customElements.define(MoreInfoLock.is, MoreInfoLock);
