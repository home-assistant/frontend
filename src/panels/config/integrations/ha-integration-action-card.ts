import type { TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import {
  domainToName,
  type IntegrationManifest,
} from "../../../data/integration";
import type { HomeAssistant } from "../../../types";
import "./ha-integration-header";
import "../../../components/ha-card";
import { brandsUrl } from "../../../util/brands-url";
import { haStyle } from "../../../resources/styles";

@customElement("ha-integration-action-card")
export class HaIntegrationActionCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public banner!: string;

  @property({ attribute: false }) public localizedDomainName?: string;

  @property() public domain!: string;

  @property() public label!: string;

  @property({ attribute: false }) public manifest?: IntegrationManifest;

  protected render(): TemplateResult {
    return html`
      <ha-card outlined>
        <div class="card-content">
          <img
            alt=""
            src=${brandsUrl({
              domain: this.domain,
              type: "icon",
              darkOptimized: this.hass.themes?.darkMode,
            })}
            crossorigin="anonymous"
            referrerpolicy="no-referrer"
            @error=${this._onImageError}
            @load=${this._onImageLoad}
          />
          <h2>${this.label}</h2>
          <h3>
            ${this.localizedDomainName ||
            domainToName(this.hass.localize, this.domain, this.manifest)}
          </h3>
        </div>
        <div class="filler"></div>
        <div class="card-actions"><slot></slot></div>
        <div class="header-button"><slot name="header-button"></slot></div>
      </ha-card>
    `;
  }

  private _onImageLoad(ev) {
    ev.target.style.visibility = "initial";
  }

  private _onImageError(ev) {
    ev.target.style.visibility = "hidden";
  }

  static styles = [
    haStyle,
    css`
      ha-card {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      img {
        width: 40px;
        height: 40px;
      }
      h2 {
        font-size: var(--ha-font-size-l);
        font-weight: var(--ha-font-weight-normal);
        margin-top: 8px;
        margin-bottom: 0;
        max-width: 100%;
      }
      h3 {
        font-size: var(--ha-font-size-m);
        margin: 0;
        max-width: 100%;
        text-align: center;
      }
      .header-button {
        position: absolute;
        top: 8px;
        right: 8px;
        inset-inline-end: 8px;
        inset-inline-start: initial;
      }
      .filler {
        flex: 1;
      }
      .attention {
        --state-color: var(--error-color);
        --text-on-state-color: var(--text-primary-color);
      }
      .card-content {
        display: flex;
        justify-content: center;
        flex-direction: column;
        align-items: center;
      }
      .card-actions {
        border-top: none;
        padding-top: 0;
        padding-bottom: 16px;
        justify-content: center;
        display: flex;
      }
      :host ::slotted(*) {
        margin-right: 8px;
        margin-inline-end: 8px;
        margin-inline-start: initial;
      }
      :host ::slotted(:last-child) {
        margin-right: 0;
        margin-inline-end: 0;
        margin-inline-start: initial;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-action-card": HaIntegrationActionCard;
  }
}
