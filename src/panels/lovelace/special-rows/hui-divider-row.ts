import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
} from "lit-element";

import { LovelaceRow, DividerConfig } from "../entity-rows/types";
import { HomeAssistant } from "../../../types";

@customElement("hui-divider-row")
class HuiDividerRow extends LitElement implements LovelaceRow {
  public hass?: HomeAssistant;

  @property() private _config?: DividerConfig;

  public setConfig(config): void {
    if (!config) {
      throw new Error("Error in card configuration.");
    }

    this._config = {
      style: {
        height: "1px",
        "background-color": "var(--secondary-text-color)",
      },
      ...config,
    };
  }

  protected render(): TemplateResult | void {
    if (!this._config) {
      return html``;
    }

    const el = document.createElement("div");

    Object.keys(this._config.style).forEach((prop) => {
      el.style.setProperty(prop, this._config!.style[prop]);
    });

    return html`
      ${el}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-divider-row": HuiDividerRow;
  }
}
