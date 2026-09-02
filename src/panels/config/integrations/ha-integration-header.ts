import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import type { IntegrationManifest } from "../../../data/integration";
import { domainToName } from "../../../data/integration";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";

@customElement("ha-integration-header")
export class HaIntegrationHeader extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public info?: string;

  @property({ attribute: false }) public localizedDomainName?: string;

  @property() public domain!: string;

  @property({ attribute: false }) public manifest?: IntegrationManifest;

  protected render(): TemplateResult {
    const domainName =
      this.localizedDomainName ||
      domainToName(this.hass.localize, this.domain, this.manifest);

    return html`
      <div class="header">
        <div class="top">
          <div class="thumbnail">
            <img
              alt=""
              src=${brandsUrl(
                {
                  domain: this.domain,
                  type: "icon",
                  darkOptimized: this.hass.themes?.darkMode,
                },
                this.hass.auth.data.hassUrl
              )}
              referrerpolicy="no-referrer"
              @error=${this._onImageError}
              @load=${this._onImageLoad}
            />
          </div>
          <div class="info">
            <div
              class="primary ${this.info ? "has-secondary" : ""}"
              role="heading"
              aria-level="1"
            >
              ${domainName}
            </div>
            ${
              this.info
                ? html`<div class="secondary">${this.info}</div>`
                : nothing
            }
          </div>
        </div>
        <slot name="footer"></slot>
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
    .header {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-3);
      position: relative;
      padding: 16px;
      direction: var(--direction);
      box-sizing: border-box;
      min-width: 0;
    }
    .top {
      display: flex;
      align-items: center;
      gap: var(--ha-space-4);
    }
    .thumbnail {
      flex-shrink: 0;
      width: 40px;
      height: 40px;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--ha-border-radius-lg);
      border: 1px solid var(--ha-color-border-neutral-quiet);
      /* inset the artwork so it does not touch the border */
      padding: 3px;
      overflow: hidden;
      direction: var(--direction);
    }
    .header img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .header .info {
      position: relative;
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }
    .primary {
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-normal);
      color: var(--primary-text-color);
    }
    .has-secondary {
      -webkit-line-clamp: 1;
      font-size: var(--ha-font-size-m);
    }
    .secondary {
      min-width: 0;
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-header": HaIntegrationHeader;
  }
}
