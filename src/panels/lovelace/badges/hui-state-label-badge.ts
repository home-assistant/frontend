import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";

import "../../../components/ha-card";

import { LovelaceBadge } from "../types";
import { StateLabelBadgeConfig } from "./types";
import { HomeAssistant } from "../../../types";

@customElement("hui-iframe-card")
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

    return html``;
  }

  static get styles(): CSSResult {
    return css``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-label-badge": HuiStateLabelBadge;
  }
}
