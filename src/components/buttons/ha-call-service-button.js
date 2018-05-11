import { PolymerElement } from '@polymer/polymer/polymer-element.js';
import './ha-progress-button.js';
import '../../util/hass-mixins.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';

class HaCallServiceButton extends window.hassMixins.EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <ha-progress-button id="progress" progress="[[progress]]" on-click="buttonTapped"><slot></slot></ha-progress-button>
`;
  }

  static get is() { return 'ha-call-service-button'; }

  static get properties() {
    return {
      hass: {
        type: Object,
      },

      progress: {
        type: Boolean,
        value: false,
      },

      domain: {
        type: String,
      },

      service: {
        type: String,
      },

      serviceData: {
        type: Object,
        value: {},
      },
    };
  }

  buttonTapped() {
    this.progress = true;
    var el = this;
    var eventData = {
      domain: this.domain,
      service: this.service,
      serviceData: this.serviceData,
    };

    this.hass.callService(this.domain, this.service, this.serviceData)
      .then(function () {
        el.progress = false;
        el.$.progress.actionSuccess();
        eventData.success = true;
      }, function () {
        el.progress = false;
        el.$.progress.actionError();
        eventData.success = false;
      }).then(function () {
        el.fire('hass-service-called', eventData);
      });
  }
}

customElements.define(HaCallServiceButton.is, HaCallServiceButton);
