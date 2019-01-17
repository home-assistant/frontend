import { html, LitElement, TemplateResult } from "lit-element";
import { EntityRow, SectionConfig } from "../entity-rows/types";
import { HomeAssistant } from "../../../types";

import "../../../components/ha-icon";

class HuiSectionRow extends LitElement implements EntityRow {
  public hass?: HomeAssistant;
  private _config?: SectionConfig;

  static get properties() {
    return {
      _config: {},
    };
  }

  public setConfig(config: SectionConfig): void {
    if (!config) {
      throw new Error("Error in card configuration.");
    }

    this._config = config;
  }

  protected render(): TemplateResult | void {
    if (!this._config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <div class="divider"></div>
      ${
        this._config.label
          ? html`
              <div class="label">${this._config.label}</div>
            `
          : html``
      }
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
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
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-section-row": HuiSectionRow;
  }
}

customElements.define("hui-section-row", HuiSectionRow);
