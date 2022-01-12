import { html } from "@polymer/polymer/lib/utils/html-tag";
/* eslint-plugin-disable lit */
import { PolymerElement } from "@polymer/polymer/polymer-element";
import { showConfirmationDialog } from "../../dialogs/generic/show-dialog-box";
import { EventsMixin } from "../../mixins/events-mixin";
import "./ha-progress-button";

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
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const el = this;
    const eventData = {
      domain: this.domain,
      service: this.service,
      serviceData: this.serviceData,
    };

    this.hass
      .callService(this.domain, this.service, this.serviceData)
      .then(
        () => {
          el.progress = false;
          el.$.progress.actionSuccess();
          eventData.success = true;
        },
        () => {
          el.progress = false;
          el.$.progress.actionError();
          eventData.success = false;
        }
      )
      .then(() => {
        el.fire("hass-service-called", eventData);
      });
  }

  buttonTapped() {
    if (this.confirmation) {
      showConfirmationDialog(this, {
        text: this.confirmation,
        confirm: () => this.callService(),
      });
    } else {
      this.callService();
    }
  }
}

customElements.define("ha-call-service-button", HaCallServiceButton);
