import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "../components/hui-generic-entity-row.js";
import "../../../components/entity/ha-entity-toggle.js";

import computeStateDisplay from "../../../common/entity/compute_state_display.js";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../types.js";
import { EntityRow, EntityConfig } from "./types.js";
import { HassEntity } from "home-assistant-js-websocket";

class HuiToggleEntityRow extends hassLocalizeLitMixin(LitElement)
  implements EntityRow {
  public hass?: HomeAssistant;
  private _config?: EntityConfig;

  static get properties(): PropertyDeclarations {
    return {
      hass: {},
      _config: {},
    };
  }

  public setConfig(config: EntityConfig): void {
    if (!config || !config.entity) {
      throw new Error("Invalid Configuration: 'entity' required");
    }

    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._config) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    return html`
      <hui-generic-entity-row
        hass=${this.hass}
        config=${this._config}
      >
        ${
          stateObj.state === "on" || stateObj.state === "off"
            ? html`
            <ha-entity-toggle
              .hass=${this.hass}
              .stateObj=${stateObj}
            ></ha-entity-toggle>`
            : html`
            <div>
              ${this._computeState(stateObj)}
            </div>`
        }
      </hui-generic-entity-row>
    `;
  }

  private _computeState(stateObj: HassEntity) {
    return stateObj && computeStateDisplay(this.localize, stateObj);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-toggle-entity-row": HuiToggleEntityRow;
  }
}

customElements.define("hui-toggle-entity-row", HuiToggleEntityRow);
