import { LitElement, html } from "lit-element";

import "./ha-progress-button";
import { fireEvent } from "../../common/dom/fire_event";

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
    };
  }

  get progressButton() {
    return this.renderRoot.querySelector("ha-progress-button");
  }

  async _buttonTapped() {
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
}

customElements.define("ha-call-api-button", HaCallApiButton);
