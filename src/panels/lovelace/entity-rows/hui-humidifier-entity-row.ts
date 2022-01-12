import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/entity/ha-entity-toggle";
import { HomeAssistant } from "../../../types";
import { hasConfigOrEntityChanged } from "../common/has-changed";
import "../components/hui-generic-entity-row";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import { EntityConfig, LovelaceRow } from "./types";

@customElement("hui-humidifier-entity-row")
class HuiHumidifierEntityRow extends LitElement implements LovelaceRow {
  @property() public hass?: HomeAssistant;

  @property() private _config?: EntityConfig;

  public setConfig(config: EntityConfig): void {
    if (!config || !config.entity) {
      throw new Error("Entity must be specified");
    }

    this._config = config;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return hasConfigOrEntityChanged(this, changedProps);
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
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
      <hui-generic-entity-row
        .hass=${this.hass}
        .config=${this._config}
        .secondaryText=${stateObj.attributes.humidity
          ? `${this.hass!.localize("ui.card.humidifier.humidity")}:
            ${stateObj.attributes.humidity} %${
              stateObj.attributes.mode
                ? ` (${
                    this.hass!.localize(
                      `state_attributes.humidifier.mode.${stateObj.attributes.mode}`
                    ) || stateObj.attributes.mode
                  })`
                : ""
            }`
          : ""}
      >
        <ha-entity-toggle
          .hass=${this.hass}
          .stateObj=${stateObj}
        ></ha-entity-toggle>
      </hui-generic-entity-row>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-humidifier-entity-row": HuiHumidifierEntityRow;
  }
}
