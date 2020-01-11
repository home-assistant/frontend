import { customElement, property, UpdatingElement } from "lit-element";

import { createRowElement } from "../common/create-row-element";
import {
  checkConditionsMet,
  validateConditionalConfig,
} from "../../lovelace/common/validate-condition";
import { HomeAssistant } from "../../../types";
import { LovelaceRow, ConditionalRowConfig } from "../entity-rows/types";

@customElement("hui-conditional-row")
class HuiConditionalRow extends UpdatingElement implements LovelaceRow {
  @property() public hass?: HomeAssistant;
  @property() private _config?: ConditionalRowConfig;
  private _row?: LovelaceRow;

  public setConfig(config) {
    if (!config.row) {
      throw new Error("No row option configured.");
    }

    if (!config.conditions) {
      throw new Error("No conditions option configured.");
    }

    if (!Array.isArray(config.conditions)) {
      throw new Error("conditions option is not an array");
    }

    if (!validateConditionalConfig(config.conditions)) {
      throw new Error("conditions option is invalid.");
    }

    if (this._row && this._row.parentElement) {
      this.removeChild(this._row);
    }

    this._config = config;
    this._row = createRowElement(config.row) as LovelaceRow;
  }

  protected update() {
    if (!this._row || !this.hass) {
      return;
    }

    const visible =
      this._config && checkConditionsMet(this._config.conditions, this.hass);

    if (visible) {
      this._row.hass = this.hass;
      if (!this._row.parentElement) {
        this.appendChild(this._row);
      }
    } else if (this._row.parentElement) {
      this.removeChild(this._row);
    }
    // This will hide the complete row so it won't get styled by parent
    this.style.setProperty("display", visible ? "" : "none");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-row": HuiConditionalRow;
  }
}
