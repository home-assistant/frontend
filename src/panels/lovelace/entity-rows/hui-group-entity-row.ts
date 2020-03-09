import {
  html,
  LitElement,
  TemplateResult,
  property,
  customElement,
  PropertyValues,
} from "lit-element";

import "../components/hui-generic-entity-row";
import "../../../components/entity/ha-entity-toggle";
import "../components/hui-warning";

import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { HomeAssistant } from "../../../types";
import { LovelaceRow, EntityConfig } from "./types";
import { hasConfigOrEntityChanged } from "../common/has-changed";

@customElement("hui-group-entity-row")
class HuiGroupEntityRow extends LitElement implements LovelaceRow {
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

  protected render(): TemplateResult {
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

    return html`
      <hui-generic-entity-row .hass=${this.hass} .config=${this._config}>
        ${this._computeCanToggle(stateObj.attributes.entity_id)
          ? html`
              <ha-entity-toggle
                .hass=${this.hass}
                .stateObj=${stateObj}
              ></ha-entity-toggle>
            `
          : html`
              <div class="text-content">
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
