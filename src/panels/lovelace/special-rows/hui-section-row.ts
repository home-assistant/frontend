import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  internalProperty,
  TemplateResult,
} from "lit-element";
import "../../../components/ha-icon";
import { HomeAssistant } from "../../../types";
import { LovelaceRow, SectionConfig } from "../entity-rows/types";

@customElement("hui-section-row")
class HuiSectionRow extends LitElement implements LovelaceRow {
  public hass?: HomeAssistant;

  @internalProperty() private _config?: SectionConfig;

  public setConfig(config: SectionConfig): void {
    if (!config) {
      throw new Error("Error in card configuration.");
    }

    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`
      <div class="divider"></div>
      ${this._config.label
        ? html` <div class="label">${this._config.label}</div> `
        : html``}
    `;
  }

  static get styles(): CSSResult {
    return css`
      .label {
        color: var(--primary-color);
        margin-left: 8px;
        margin-bottom: 16px;
        margin-top: 16px;
      }
      .divider {
        height: 1px;
        background-color: var(--divider-color);
        margin-left: -16px;
        margin-right: -16px;
        margin-top: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section-row": HuiSectionRow;
  }
}
