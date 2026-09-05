import { mdiAlertCircleOutline, mdiAlertOutline } from "@mdi/js";
import { consume } from "@lit/context";
import type { TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { consumeLocalize } from "../../../common/decorators/consume-context-entry";
import { transform } from "../../../common/decorators/transform";
import type { LocalizeFunc } from "../../../common/translations/localize";
import "../../../components/ha-svg-icon";
import { configContext, uiContext } from "../../../data/context";
import type { IntegrationManifest } from "../../../data/integration";
import { domainToName } from "../../../data/integration";
import type { HomeAssistantConfig, HomeAssistantUI } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";

@customElement("ha-integration-card-header")
export class HaIntegrationCardHeader extends LitElement {
  @property() public error?: string;

  @property() public warning?: string;

  @property({ attribute: false }) public localizedDomainName?: string;

  @property() public domain!: string;

  @property({ attribute: false }) public manifest?: IntegrationManifest;

  @state()
  @consumeLocalize()
  private _localize!: LocalizeFunc;

  @state()
  @consume({ context: uiContext, subscribe: true })
  @transform<HomeAssistantUI, boolean | undefined>({
    transformer: ({ themes }) => themes?.darkMode,
  })
  private _darkMode?: boolean;

  @state()
  @consume({ context: configContext, subscribe: true })
  @transform<HomeAssistantConfig, string>({
    transformer: ({ auth }) => auth.data.hassUrl,
  })
  private _hassUrl!: string;

  protected render(): TemplateResult {
    const domainName =
      this.localizedDomainName ||
      domainToName(this._localize, this.domain, this.manifest);

    return html`
      <div class="header">
        <img
          alt=""
          src=${brandsUrl(
            {
              domain: this.domain,
              type: "icon",
              darkOptimized: this._darkMode,
            },
            this._hassUrl
          )}
          crossorigin="anonymous"
          referrerpolicy="no-referrer"
          @error=${this._onImageError}
          @load=${this._onImageLoad}
        />
        <div class="info">
          <div
            class="primary ${this.warning || this.error ? "has-secondary" : ""}"
            role="heading"
            aria-level="1"
          >
            ${domainName}
          </div>
          ${
            this.error
              ? html`
                  <div class="secondary error">
                    <ha-svg-icon .path=${mdiAlertCircleOutline}></ha-svg-icon>
                    <span>${this.error}</span>
                  </div>
                `
              : this.warning
                ? html`
                    <div class="secondary warning">
                      <ha-svg-icon .path=${mdiAlertOutline}></ha-svg-icon>
                      <span>${this.warning}</span>
                    </div>
                  `
                : nothing
          }
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
    :host {
      display: block;
      flex: 1;
      padding-bottom: var(--ha-space-2);
    }
    .header {
      display: flex;
      align-items: center;
      direction: var(--direction);
      min-width: 0;
    }
    .header img {
      margin-inline-start: initial;
      margin-inline-end: var(--ha-space-4);
      width: 40px;
      height: 40px;
      direction: var(--direction);
    }
    .info {
      display: flex;
      flex-direction: column;
      flex: 1;
      align-self: center;
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
      --mdc-icon-size: 20px;
      font-size: var(--ha-font-size-s);
      display: flex;
      flex-direction: row;
      align-items: flex-start;
    }
    .secondary > span {
      position: relative;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .secondary > ha-svg-icon {
      margin-inline-end: var(--ha-space-1);
      flex-shrink: 0;
    }
    .error ha-svg-icon {
      color: var(--error-color);
    }
    .warning ha-svg-icon {
      color: var(--warning-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-card-header": HaIntegrationCardHeader;
  }
}
