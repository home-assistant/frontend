import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
} from "lit-element";

import "../../../components/entity/ha-state-label-badge";
import "../components/hui-warning-element";

import { LovelaceBadge } from "../types";
import { HomeAssistant } from "../../../types";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { LovelaceBadgeConfig } from "../../../data/lovelace";

@customElement("hui-state-label-badge")
export class HuiStateLabelBadge extends LitElement implements LovelaceBadge {
  @property() public hass?: HomeAssistant;
  @property() protected _config?: LovelaceBadgeConfig;

  public setConfig(config: LovelaceBadgeConfig): void {
    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity!];

    return html`
      <ha-state-label-badge
        .hass=${this.hass}
        .state=${stateObj}
        .title=${this._config.name === undefined
          ? stateObj
            ? computeStateName(stateObj)
            : ""
          : this._config.name === null
          ? ""
          : this._config.name}
        .icon=${this._config.icon}
        .image=${this._config.image}
      ></ha-state-label-badge>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-label-badge": HuiStateLabelBadge;
  }
}
