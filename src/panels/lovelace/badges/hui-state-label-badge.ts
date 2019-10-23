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
import { StateLabelBadgeConfig } from "./types";
import { longPress } from "../common/directives/long-press-directive";
import { hasDoubleClick } from "../common/has-double-click";
import { handleClick } from "../common/handle-click";

@customElement("hui-state-label-badge")
export class HuiStateLabelBadge extends LitElement implements LovelaceBadge {
  @property() public hass?: HomeAssistant;
  @property() protected _config?: StateLabelBadgeConfig;

  public setConfig(config: StateLabelBadgeConfig): void {
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
        .title=${this._config.name
          ? this._config.name
          : stateObj
          ? computeStateName(stateObj)
          : ""}
        .icon=${this._config.icon}
        .image=${this._config.image}
        @ha-click=${this._handleClick}
        @ha-hold=${this._handleHold}
        @ha-dblclick=${this._handleDblClick}
        .longPress=${longPress({
          hasDoubleClick: hasDoubleClick(this._config!.double_tap_action),
        })}
      ></ha-state-label-badge>
    `;
  }

  private _handleClick() {
    handleClick(this, this.hass!, this._config!, false, false);
  }

  private _handleHold() {
    handleClick(this, this.hass!, this._config!, true, false);
  }

  private _handleDblClick() {
    handleClick(this, this.hass!, this._config!, false, true);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-label-badge": HuiStateLabelBadge;
  }
}
