import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';


import './ha-progress-button.js';
import EventsMixin from '../../mixins/events-mixin.js';

class HaCallApiButton extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <ha-progress-button id="progress" progress="[[progress]]" on-click="buttonTapped" disabled="[[disabled]]"><slot></slot></ha-progress-button>
`;
  }

  static get properties() {
    return {
      hass: Object,

      progress: {
        type: Boolean,
        value: false,
      },

      path: String,

      method: {
        type: String,
        value: 'POST',
      },

      data: {
        type: Object,
        value: {},
      },

      disabled: {
        type: Boolean,
        value: false,
      },
    };
  }

  buttonTapped() {
    this.progress = true;
    const eventData = {
      method: this.method,
      path: this.path,
      data: this.data,
    };

    this.hass.callApi(this.method, this.path, this.data)
      .then((resp) => {
        this.progress = false;
        this.$.progress.actionSuccess();
        eventData.success = true;
        eventData.response = resp;
      }, (resp) => {
        this.progress = false;
        this.$.progress.actionError();
        eventData.success = false;
        eventData.response = resp;
      }).then(() => {
        this.fire('hass-api-called', eventData);
      });
  }
}

customElements.define('ha-call-api-button', HaCallApiButton);
