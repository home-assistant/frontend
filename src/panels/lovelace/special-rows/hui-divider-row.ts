import { html, LitElement } from "@polymer/lit-element";
import { EntityRow, DividerConfig } from "../entity-rows/types";
import { HomeAssistant } from "../../../types";

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

    if (!config.style) {
      config.style = {
        height: "1px",
        "background-color": "var(--secondary-text-color)",
      };
    }

    this._config = config;
  }

  protected render() {
    if (!this._config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <div></div>
    `;
  }

  private renderStyle() {
    return html`
      <style>
        div {
          ${this._config!.style}
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-divider-row": HuiDividerRow;
  }
}

customElements.define("hui-divider-row", HuiDividerRow);
