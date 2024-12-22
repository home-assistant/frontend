import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import { HomeAssistant } from "../../../types";
import { DividerConfig, LovelaceRow } from "../entity-rows/types";

@customElement("hui-divider-row")
class HuiDividerRow extends LitElement implements LovelaceRow {
  public hass?: HomeAssistant;

  @state() private _config?: DividerConfig;

  public setConfig(config): void {
    if (!config) {
      throw new Error("Error in card configuration.");
    }

    this._config = config;
  }

  protected render() {
    if (!this._config) {
      return nothing;
    }

    return html`<div
      style=${this._config.style ? styleMap(this._config.style) : ""}
    ></div>`;
  }

  static get styles(): CSSResultGroup {
    return css`
      div {
        height: 1px;
        background-color: var(--entities-divider-color, var(--divider-color));
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-divider-row": HuiDividerRow;
  }
}
