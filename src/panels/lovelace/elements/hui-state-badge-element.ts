import { html, LitElement, TemplateResult } from "lit-element";

import "../../../components/entity/ha-state-label-badge";

import computeStateName from "../../../common/entity/compute_state_name";
import { LovelaceElement, LovelaceElementConfig } from "./types";
import { HomeAssistant } from "../../../types";

export class HuiStateBadgeElement extends LitElement
  implements LovelaceElement {
  public hass?: HomeAssistant;
  private _config?: LovelaceElementConfig;

  static get properties() {
    return { hass: {}, _config: {} };
  }

  public setConfig(config: LovelaceElementConfig): void {
    if (!config.entity) {
      throw Error("Invalid Configuration: 'entity' required");
    }

    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (
      !this._config ||
      !this.hass ||
      !this.hass.states[this._config.entity!]
    ) {
      return html``;
    }

    const state = this.hass.states[this._config.entity!];
    return html`
      <ha-state-label-badge
        .hass="${this.hass}"
        .state="${state}"
        .title="${computeStateName(state)}"
      ></ha-state-label-badge>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-badge-element": HuiStateBadgeElement;
  }
}

customElements.define("hui-state-badge-element", HuiStateBadgeElement);
