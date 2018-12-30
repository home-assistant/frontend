import { LitElement, html } from "@polymer/lit-element";

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
    this.data = {};
    this.disabled = false;
    this.progress = false;
  }

  static get properties() {
    return {
      hass: {},
      progress: Boolean,
      type: String,
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
      data: this.data,
      wsType: this.type,
    };
    eventData.data.type = this.type;
    try {
      eventData.response = await this.hass.callWS(eventData.data);
      this.progress = false;
      this.progressButton.actionSuccess();
      eventData.success = true;
    } catch (err) {
      this.progress = false;
      this.progressButton.actionError();
      eventData.success = false;
      eventData.response = err;
    }

    fireEvent(this, "hass-ws-api-called", eventData);
  }
}

customElements.define("ha-call-ws-api-button", HaCallApiButton);
