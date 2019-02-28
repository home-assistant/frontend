import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
} from "lit-element";

import "../../../components/entity/ha-state-label-badge";
import "../components/hui-warning";

import computeStateName from "../../../common/entity/compute_state_name";
import { LovelaceElement, LovelaceElementConfig } from "./types";
import { HomeAssistant } from "../../../types";

export interface Config extends LovelaceElementConfig {
  entity: string;
}

@customElement("hui-state-badge-element")
export class HuiStateBadgeElement extends LitElement
  implements LovelaceElement {
  @property() public hass?: HomeAssistant;
  @property() private _config?: Config;

  public setConfig(config: Config): void {
    if (!config.entity) {
      throw Error("Invalid Configuration: 'entity' required");
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
      <ha-state-label-badge
        .hass="${this.hass}"
        .state="${stateObj}"
        .title="${computeStateName(stateObj)}"
      ></ha-state-label-badge>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-state-badge-element": HuiStateBadgeElement;
  }
}
