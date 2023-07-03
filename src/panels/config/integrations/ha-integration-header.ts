import { mdiAlertCircleOutline, mdiAlertOutline } from "@mdi/js";
import { LitElement, TemplateResult, css, html, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-icon-next";
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
                <ha-svg-icon .path=${mdiAlertCircleOutline}></ha-svg-icon>
                <span>${this.error}</span>
              </div>`
            : this.warning
            ? html`<div class="warning">
                <ha-svg-icon .path=${mdiAlertOutline}></ha-svg-icon>
                <span>${this.warning}</span>
              </div>`
            : nothing}
        </div>
        <ha-icon-next
          class="header-button"
          .label=${this.hass.localize(
            "ui.panel.config.integrations.config_entry.configure"
          )}
        ></ha-icon-next>
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
      align-items: center;
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
    ha-icon-next {
      color: var(--secondary-text-color);
    }
    .primary,
    .warning,
    .error {
      word-wrap: break-word;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-box-orient: vertical;
    }
    .primary {
      font-size: 16px;
      font-weight: 400;
      color: var(--primary-text-color);
      -webkit-line-clamp: 2;
    }
    .hasError {
      -webkit-line-clamp: 1;
      font-size: 14px;
    }
    .warning,
    .error {
      --mdc-icon-size: 20px;
      -webkit-line-clamp: 1;
      font-size: 0.9em;
    }
    .warning > span,
    .error > span {
      position: relative;
      top: 1px;
    }
    .error ha-svg-icon {
      margin-right: 4px;
      color: var(--error-color);
      flex-shrink: 0;
    }
    .warning ha-svg-icon {
      margin-right: 4px;
      color: var(--warning-color);
      flex-shrink: 0;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-header": HaIntegrationHeader;
  }
}
