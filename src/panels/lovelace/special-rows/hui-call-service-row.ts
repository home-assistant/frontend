import { html, LitElement } from "@polymer/lit-element";
import "@polymer/paper-button/paper-button.js";

import "../../../components/ha-icon.js";

import callService from "../common/call-service.js";
import { EntityRow, CallServiceConfig } from "../entity-rows/types.js";
import { HomeAssistant } from "../../../types.js";
import { TemplateResult } from "lit-html";

class HuiCallServiceRow extends LitElement implements EntityRow {
  public hass?: HomeAssistant;
  private _config?: CallServiceConfig;

  static get properties() {
    return {
      hass: {},
      _config: {},
    };
  }

  public setConfig(config: CallServiceConfig): void {
    if (
      !config ||
      !config.icon ||
      !config.name ||
      !config.action_name ||
      !config.service
    ) {
      throw new Error("Error in card configuration.");
    }
    this._config = config;
  }

  protected render(): TemplateResult {
    if (!this._config) {
      return html``;
    }

    return html`
      ${this.renderStyle()}
      <ha-icon icon="${this._config.icon}"></ha-icon>
      <div class="flex">
        <div>
          ${this._config.name}
        </div>
        <paper-button
          @click="${this._callService}"
        >${this._config.action_name}</paper-button>
      </div>
    `;
  }

  private renderStyle(): TemplateResult {
    return html`
      <style>
        :host {
          display: flex;
          align-items: center;
        }
        ha-icon {
          padding: 8px;
          color: var(--paper-item-icon-color);
        }
        .flex {
          flex: 1;
          overflow: hidden;
          margin-left: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .flex div {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        paper-button {
          color: var(--primary-color);
          font-weight: 500;
          margin-right: -.57em;
        }
      </style>
    `;
  }

  private _callService() {
    callService(this._config, this.hass);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-call-service-row": HuiCallServiceRow;
  }
}

customElements.define("hui-call-service-row", HuiCallServiceRow);
