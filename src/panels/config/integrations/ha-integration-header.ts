import { mdiAlertCircleOutline, mdiAlertOutline } from "@mdi/js";
import { LitElement, TemplateResult, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-svg-icon";
import { IntegrationManifest, domainToName } from "../../../data/integration";
import { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";

@customElement("ha-integration-header")
export class HaIntegrationHeader extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public error?: string;

  @property() public warning?: string;

  @property() public localizedDomainName?: string;

  @property() public domain!: string;

  @property({ attribute: false }) public manifest?: IntegrationManifest;

  protected render(): TemplateResult {
    const domainName =
      this.localizedDomainName ||
      domainToName(this.hass.localize, this.domain, this.manifest);

    return html`
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
          <div
            class="primary ${this.warning || this.error ? "hasError" : ""}"
            role="heading"
            aria-level="1"
          >
            ${domainName}
          </div>
          ${this.error
            ? html`<div class="error">
                <ha-svg-icon .path=${mdiAlertCircleOutline}></ha-svg-icon>${this
                  .error}
              </div>`
            : this.warning
            ? html`<div class="warning">
                <ha-svg-icon .path=${mdiAlertOutline}></ha-svg-icon>${this
                  .warning}
              </div>`
            : nothing}
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
    .primary,
    .warning,
    .error {
      word-wrap: break-word;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .primary {
      font-size: 16px;
      font-weight: 400;
      word-break: break-word;
      color: var(--primary-text-color);
      -webkit-line-clamp: 2;
    }
    .hasError {
      -webkit-line-clamp: 1;
      font-size: 14px;
    }
    .warning,
    .error {
      line-height: 20px;
      --mdc-icon-size: 20px;
      -webkit-line-clamp: 1;
      font-size: 0.9em;
    }
    .error ha-svg-icon {
      margin-right: 4px;
      color: var(--error-color);
    }
    .warning ha-svg-icon {
      margin-right: 4px;
      color: var(--warning-color);
    }
    .header-button {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-header": HaIntegrationHeader;
  }
}
