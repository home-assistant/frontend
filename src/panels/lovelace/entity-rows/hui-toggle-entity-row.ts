import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  PropertyValues,
} from "lit-element";

import "../components/hui-generic-entity-row";
import "../../../components/entity/ha-entity-toggle";
import "../components/hui-warning";

import computeStateDisplay from "../../../common/entity/compute_state_display";

import { HomeAssistant } from "../../../types";
import { EntityRow, EntityConfig } from "./types";
import { hasConfigOrEntityChanged } from "../common/has-changed";

@customElement("hui-toggle-entity-row")
class HuiToggleEntityRow extends LitElement implements EntityRow {
  @property() public hass?: HomeAssistant;

  @property() private _config?: EntityConfig;

  public setConfig(config: EntityConfig): void {
    if (!config) {
      throw new Error("Configuration error");
    }
    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

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

    return this.template(stateObj);
  }

  protected template(stateObj): TemplateResult {
    return html`
      <hui-generic-entity-row .hass="${this.hass}" .config="${this._config}">
        ${stateObj.state === "on" || stateObj.state === "off"
          ? html`
              <ha-entity-toggle
                .hass="${this.hass}"
                .stateObj="${stateObj}"
              ></ha-entity-toggle>
            `
          : html`
              <div>
                ${this._computeState(stateObj)}
              </div>
            `}
      </hui-generic-entity-row>
    `;
  }

  private _computeState(stateObj): string {
    return !this.hass
      ? ""
      : computeStateDisplay(this.hass!.localize, stateObj, this.hass.language);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-toggle-entity-row": HuiToggleEntityRow;
  }
}
