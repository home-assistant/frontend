import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";

import "../../../components/entity/state-badge";
import "../components/hui-warning";
import "../../../components/ha-cover-controls";
import "../../../components/ha-cover-tilt-controls";

import { isTiltOnly } from "../../../util/cover-model";
import { LovelaceElement, LovelaceElementConfig } from "./types";
import { HomeAssistant } from "../../../types";
import { ActionConfig } from "../../../data/lovelace";

export interface Config extends LovelaceElementConfig {
  entity: string;
  tap_action?: ActionConfig;
  hold_action?: ActionConfig;
}

@customElement("hui-cover-element")
export class HuiCoverElement extends LitElement implements LovelaceElement {
  @property() public hass?: HomeAssistant;
  @property() private _config?: Config;

  public setConfig(config: Config): void {
    if (!config.entity) {
      throw Error("Invalid Configuration: 'entity' required");
    }

    if (config.tap_action) {
      throw Error("Invalid Configuration: 'tap_action' not allowed");
    }

    if (config.hold_action) {
      throw Error("Invalid Configuration: 'hold_action' not allowed");
    }

    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity!];

    if (!stateObj) {
      return html`
        <hui-warning
          >${this.hass.localize(
            "ui.panel.lovelace.warning.entity_not_found",
            "entity",
            this._config.entity
          )}</hui-warning
        >
      `;
    }

    return html`
      ${isTiltOnly(stateObj)
        ? html`
            <ha-cover-tilt-controls
              .hass="${this.hass}"
              .stateObj="${stateObj}"
            ></ha-cover-tilt-controls>
          `
        : html`
            <ha-cover-controls
              .hass="${this.hass}"
              .stateObj="${stateObj}"
            ></ha-cover-controls>
          `}
    `;
  }

  static get styles(): CSSResult {
    return css`
      ha-cover-controls,
      ha-cover-tilt-controls {
        margin-right: -0.57em;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-cover-element": HuiCoverElement;
  }
}
