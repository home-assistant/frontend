import { html, LitElement } from "@polymer/lit-element";
import { EntityRow, WeblinkConfig } from "../entity-rows/types";
import { HomeAssistant } from "../../../types";

import "../../../components/ha-icon.js";

import { TemplateResult } from "lit-html";

class HuiWeblinkRow extends LitElement implements EntityRow {
  public hass?: HomeAssistant;
  private _config?: WeblinkConfig;

  static get properties() {
    return {
      _config: {},
    };
  }

  public setConfig(config: WeblinkConfig): void {
    if (!config || !config.url) {
      throw new Error("Invalid Configuration: 'url' required");
    }

    config.icon = config.icon || "hass:link";
    config.name = config.name || config.url;
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <a href="${this._config.url}">
        <ha-icon .icon="${this._config.icon}"></ha-icon>
        <div>${this._config.name}</div>
      </a>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        a {
          display: flex;
          align-items: center;
          color: var(--primary-color);
        }
        ha-icon {
          padding: 8px;
          color: var(--paper-item-icon-color);
        }
        div {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-left: 16px;
        }
      </style>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-weblink-row": HuiWeblinkRow;
  }
}

customElements.define("hui-weblink-row", HuiWeblinkRow);
