import { createRowElement } from "../common/create-row-element";
import {
  checkConditionsMet,
  validateConditionalConfig,
} from "../../lovelace/common/validate-condition";
import { HomeAssistant } from "../../../types";
import { LovelaceRow, ConditionalRowConfig } from "../entity-rows/types";

class HuiConditionalRow extends HTMLElement implements LovelaceRow {
  private _hass?: HomeAssistant;
  private _config?: ConditionalRowConfig;
  private _row?: LovelaceRow;

  public setConfig(config) {
    if (
      !config.row ||
      !config.conditions ||
      !Array.isArray(config.conditions) ||
      !validateConditionalConfig(config.conditions)
    ) {
      throw new Error("Error in row configuration.");
    }

    if (this._row && this._row.parentElement) {
      this.removeChild(this._row);
    }

    this._config = config;
    this._row = createRowElement(config.row) as LovelaceRow;

    this.update();
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;

    this.update();
  }

  private update() {
    if (!this._row || !this._hass) {
      return;
    }

    const visible =
      this._config && checkConditionsMet(this._config.conditions, this._hass);

    if (visible) {
      this._row.hass = this._hass;
      if (!this._row.parentElement) {
        this.appendChild(this._row);
      }
    } else if (this._row.parentElement) {
      this.removeChild(this._row);
    }
    // This will hide the complete card so it won't get styled by parent
    this.style.setProperty("display", visible ? "" : "none");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-row": HuiConditionalRow;
  }
}

customElements.define("hui-conditional-row", HuiConditionalRow);
