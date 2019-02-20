import {
  html,
  LitElement,
  TemplateResult,
  property,
  customElement,
} from "lit-element";

import "../components/hui-generic-entity-row";
import "../../../components/entity/ha-entity-toggle";

import computeStateDisplay from "../../../common/entity/compute_state_display";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { HomeAssistant } from "../../../types";
import { EntityRow, EntityConfig } from "./types";

@customElement("hui-group-entity-row")
class HuiGroupEntityRow extends LitElement implements EntityRow {
  @property() public hass?: HomeAssistant;

  @property() private _config?: EntityConfig;

  public setConfig(config: EntityConfig): void {
    if (!config) {
      throw new Error("Configuration error");
    }
    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    return html`
      <hui-generic-entity-row .hass="${this.hass}" .config="${this._config}">
        ${this._computeCanToggle(stateObj.attributes.entity_id)
          ? html`
              <ha-entity-toggle
                .hass="${this.hass}"
                .stateObj="${stateObj}"
              ></ha-entity-toggle>
            `
          : html`
              <div>
                ${computeStateDisplay(
                  this.hass!.localize,
                  stateObj,
                  this.hass.language
                )}
              </div>
            `}
      </hui-generic-entity-row>
    `;
  }

  private _computeCanToggle(entityIds): boolean {
    return entityIds.some((entityId) =>
      DOMAINS_TOGGLE.has(entityId.split(".", 1)[0])
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-group-entity-row": HuiGroupEntityRow;
  }
}
