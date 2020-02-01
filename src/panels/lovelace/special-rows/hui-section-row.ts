import {
  html,
  LitElement,
  TemplateResult,
  customElement,
  property,
  css,
  CSSResult,
} from "lit-element";

import { LovelaceRow, SectionConfig } from "../entity-rows/types";
import { HomeAssistant } from "../../../types";

import "../../../components/ha-icon";

@customElement("hui-section-row")
class HuiSectionRow extends LitElement implements LovelaceRow {
  public hass?: HomeAssistant;

  @property() private _config?: SectionConfig;

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
        ? html`
            <div class="label">${this._config.label}</div>
          `
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
        background-color: var(--secondary-text-color);
        opacity: 0.25;
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
