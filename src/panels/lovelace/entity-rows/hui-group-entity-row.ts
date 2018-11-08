import { html, LitElement, PropertyDeclarations } from "@polymer/lit-element";
import { TemplateResult } from "lit-html";

import "../components/hui-generic-entity-row";
import "../../../components/entity/ha-entity-toggle";
import "./hui-error-entity-row";

import computeStateDisplay from "../../../common/entity/compute_state_display";
import { DOMAINS_TOGGLE } from "../../../common/const";
import { hassLocalizeLitMixin } from "../../../mixins/lit-localize-mixin";
import { HomeAssistant } from "../../../types";
import { EntityRow, EntityConfig } from "./types";

class HuiGroupEntityRow extends hassLocalizeLitMixin(LitElement)
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
    if (!config) {
      throw new Error("Configuration error");
    }
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config || !this.hass) {
      return html``;
    }

    const stateObj = this.hass.states[this._config.entity];

    if (!stateObj) {
      return html`
        <hui-error-entity-row
          .entity="${this._config.entity}"
        ></hui-error-entity-row>
      `;
    }

    return html`
      <hui-generic-entity-row .hass="${this.hass}" .config="${this._config}">
        >
        ${
          this._computeCanToggle(stateObj.attributes.entity_id)
            ? html`
                <ha-entity-toggle
                  .hass="${this.hass}"
                  .stateObj="${stateObj}"
                ></ha-entity-toggle>
              `
            : html`
                <div>
                  ${
                    computeStateDisplay(
                      this.localize,
                      stateObj,
                      this.hass.language
                    )
                  }
                </div>
              `
        }
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

customElements.define("hui-group-entity-row", HuiGroupEntityRow);
