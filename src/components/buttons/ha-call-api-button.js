import { LitElement, html } from "lit-element";

import "./ha-progress-button";
import { fireEvent } from "../../common/dom/fire_event";
import { showConfirmationDialog } from "../../dialogs/confirmation/show-dialog-confirmation";

class HaCallApiButton extends LitElement {
  render() {
    return html`
      <ha-progress-button
        .progress="${this.progress}"
        @click="${this._buttonTapped}"
        ?disabled="${this.disabled}"
        ><slot></slot
      ></ha-progress-button>
    `;
  }

  constructor() {
    super();
    this.method = "POST";
    this.data = {};
    this.disabled = false;
    this.progress = false;
  }

  static get properties() {
    return {
      hass: {},
      progress: Boolean,
      path: String,
      method: String,
      data: {},
      disabled: Boolean,
      confirmation: String,
    };
  }

  get progressButton() {
    return this.renderRoot.querySelector("ha-progress-button");
  }

  async callApi() {
    this.progress = true;
    const eventData = {
      method: this.method,
      path: this.path,
      data: this.data,
    };

    try {
      const resp = await this.hass.callApi(this.method, this.path, this.data);
      this.progress = false;
      this.progressButton.actionSuccess();
      eventData.success = true;
      eventData.response = resp;
    } catch (err) {
      this.progress = false;
      this.progressButton.actionError();
      eventData.success = false;
      eventData.response = err;
    }

    fireEvent(this, "hass-api-called", eventData);
  }

  async _buttonTapped() {
    if (this.confirmation) {
      showConfirmationDialog(this, {
        text: this.confirmation,
        confirm: async () => await this._callApi(),
      });
    } else {
      await this._callApi();
    }
  }
}

customElements.define("ha-call-api-button", HaCallApiButton);
