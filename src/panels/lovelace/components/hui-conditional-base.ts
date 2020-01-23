import { customElement, property, UpdatingElement } from "lit-element";

import {
  checkConditionsMet,
  validateConditionalConfig,
} from "../common/validate-condition";
import { HomeAssistant } from "../../../types";
import { LovelaceCard } from "../types";
import { LovelaceRow, ConditionalRowConfig } from "../entity-rows/types";
import { ConditionalCardConfig } from "../cards/types";

@customElement("hui-conditional-base")
export class HuiConditionalBase extends UpdatingElement {
  @property() public hass?: HomeAssistant;
  @property() protected _config?: ConditionalCardConfig | ConditionalRowConfig;
  protected _element?: LovelaceCard | LovelaceRow;

  public setConfig(config: ConditionalCardConfig | ConditionalRowConfig): void {
    if (!config.conditions) {
      throw new Error("No conditions option configured.");
    }

    if (!Array.isArray(config.conditions)) {
      throw new Error("conditions option is not an array");
    }

    if (!validateConditionalConfig(config.conditions)) {
      throw new Error("conditions option is invalid.");
    }

    if (this._element && this._element.parentElement) {
      this.removeChild(this._element);
    }

    this._config = config;
  }

  protected update(): void {
    if (!this._element || !this.hass) {
      return;
    }

    const visible =
      this._config && checkConditionsMet(this._config.conditions, this.hass);

    if (visible) {
      this._element.hass = this.hass;
      if (!this._element.parentElement) {
        this.appendChild(this._element);
      }
    } else if (this._element.parentElement) {
      this.removeChild(this._element);
    }

    this.style.setProperty("display", visible ? "" : "none");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-base": HuiConditionalBase;
  }
}
