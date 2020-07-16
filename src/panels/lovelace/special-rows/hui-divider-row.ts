import {
  customElement,
  html,
  LitElement,
  internalProperty,
  TemplateResult,
} from "lit-element";
import { HomeAssistant } from "../../../types";
import { DividerConfig, LovelaceRow } from "../entity-rows/types";

@customElement("hui-divider-row")
class HuiDividerRow extends LitElement implements LovelaceRow {
  public hass?: HomeAssistant;

  @internalProperty() private _config?: DividerConfig;

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

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    const el = document.createElement("div");

    Object.keys(this._config.style).forEach((prop) => {
      el.style.setProperty(prop, this._config!.style[prop]);
    });

    return html` ${el} `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-divider-row": HuiDividerRow;
  }
}
