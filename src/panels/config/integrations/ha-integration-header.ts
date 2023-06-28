import { LitElement, TemplateResult, css, html } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-svg-icon";
import { IntegrationManifest, domainToName } from "../../../data/integration";
import { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";

@customElement("ha-integration-header")
export class HaIntegrationHeader extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public banner?: string;

  @property() public label?: string;

  @property() public localizedDomainName?: string;

  @property() public domain!: string;

  @property({ attribute: false }) public manifest?: IntegrationManifest;

  protected render(): TemplateResult {
    let primary: string;
    let secondary: string | undefined;

    const domainName =
      this.localizedDomainName ||
      domainToName(this.hass.localize, this.domain, this.manifest);

    if (this.label) {
      primary = this.label;
      secondary =
        primary.toLowerCase() === domainName.toLowerCase()
          ? undefined
          : domainName;
    } else {
      primary = domainName;
    }

    return html`
      ${!this.banner ? "" : html`<div class="banner">${this.banner}</div>`}
      <div class="header">
        <img
          alt=""
          src=${brandsUrl({
            domain: this.domain,
            type: "icon",
            darkOptimized: this.hass.themes?.darkMode,
          })}
          referrerpolicy="no-referrer"
          @error=${this._onImageError}
          @load=${this._onImageLoad}
        />
        <div class="info">
          <div class="primary" role="heading">${primary}</div>
          <div class="secondary">${secondary}</div>
        </div>
        <div class="header-button">
          <slot name="header-button"></slot>
        </div>
      </div>
    `;
  }

  private _onImageLoad(ev) {
    ev.target.style.visibility = "initial";
  }

  private _onImageError(ev) {
    ev.target.style.visibility = "hidden";
  }

  static styles = css`
    .banner {
      background-color: var(--state-color);
      color: var(--text-on-state-color);
      text-align: center;
      padding: 2px;

      /* Padding is subtracted for nested elements with border radiuses */
      border-top-left-radius: calc(var(--ha-card-border-radius, 12px) - 2px);
      border-top-right-radius: calc(var(--ha-card-border-radius, 12px) - 2px);
    }
    .header {
      display: flex;
      position: relative;
      padding-top: 16px;
      padding-bottom: 16px;
      padding-inline-start: 16px;
      padding-inline-end: 8px;
      direction: var(--direction);
    }
    .header img {
      margin-inline-start: initial;
      margin-inline-end: 16px;
      width: 40px;
      height: 40px;
      direction: var(--direction);
    }
    .header .info {
      flex: 1;
      align-self: center;
    }
    .header .info div {
      word-wrap: break-word;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .header-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
    }
    .primary {
      font-size: 16px;
      font-weight: 400;
      word-break: break-word;
      color: var(--primary-text-color);
    }
    .secondary {
      font-size: 14px;
      color: var(--secondary-text-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-header": HaIntegrationHeader;
  }
}
