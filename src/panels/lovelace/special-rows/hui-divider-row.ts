import { html, LitElement } from "@polymer/lit-element";
import { EntityRow, DividerConfig } from "../entity-rows/types";
import { HomeAssistant } from "../../../types";
import { TemplateResult } from "lit-html";

class HuiDividerRow extends LitElement implements EntityRow {
  public hass?: HomeAssistant;
  private _config?: DividerConfig;

  static get properties() {
    return {
      _config: {},
    };
  }

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

customElements.define("hui-divider-row", HuiDividerRow);
