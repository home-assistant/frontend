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

  protected validateConfig(
    config: ConditionalCardConfig | ConditionalRowConfig
  ): void {
    if (!config.conditions) {
      throw new Error("No conditions configured.");
    }

    if (!Array.isArray(config.conditions)) {
      throw new Error("Conditions should be in an array.");
    }

    if (!validateConditionalConfig(config.conditions)) {
      throw new Error("Conditions are invalid.");
    }

    this._config = config;
    this.style.display = "none";
  }

  protected update(): void {
    if (!this._element || !this.hass || !this._config) {
      return;
    }

    const visible = checkConditionsMet(this._config.conditions, this.hass);

    if (visible) {
      this._element.hass = this.hass;
    }

    this.style.setProperty("display", visible ? "" : "none");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-conditional-base": HuiConditionalBase;
  }
}
