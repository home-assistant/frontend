import { html } from "@polymer/polymer/lib/utils/html-tag";
import { PolymerElement } from "@polymer/polymer/polymer-element";

import "./ha-progress-button";
import { EventsMixin } from "../../mixins/events-mixin";
import { showConfirmationDialog } from "../../dialogs/generic/show-dialog-box";

/*
 * @appliesMixin EventsMixin
 */
class HaCallServiceButton extends EventsMixin(PolymerElement) {
  static get template() {
    return html`
      <ha-progress-button
        id="progress"
        progress="[[progress]]"
        on-click="buttonTapped"
        tabindex="0"
        ><slot></slot
      ></ha-progress-button>
    `;
  }

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

      confirmation: {
        type: String,
      },
    };
  }

  callService() {
    this.progress = true;
    var el = this;
    var eventData = {
      domain: this.domain,
      service: this.service,
      serviceData: this.serviceData,
    };

    this.hass
      .callService(this.domain, this.service, this.serviceData)
      .then(
        function() {
          el.progress = false;
          el.$.progress.actionSuccess();
          eventData.success = true;
        },
        function() {
          el.progress = false;
          el.$.progress.actionError();
          eventData.success = false;
        }
      )
      .then(function() {
        el.fire("hass-service-called", eventData);
      });
  }

  buttonTapped() {
    if (this.confirmation) {
      showConfirmationDialog(this, {
        confirmation: true,
        text: this.confirmation,
        confirm: () => this.callService(),
      });
    } else {
      this.callService();
    }
  }
}

customElements.define("ha-call-service-button", HaCallServiceButton);
