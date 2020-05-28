import {
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { computeStateDisplay } from "../../../common/entity/compute_state_display";
import "../../../components/entity/ha-entity-toggle";
import { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { EntityConfig, LovelaceRow } from "./types";

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
        <hui-warning>
          ${createEntityNotFoundWarning(this.hass, this._config.entity)}
        </hui-warning>
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
