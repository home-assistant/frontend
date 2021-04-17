import { mdiPackageVariant, mdiCloud } from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  css,
  html,
  customElement,
  property,
  LitElement,
  TemplateResult,
} from "lit-element";
import { domainToName, IntegrationManifest } from "../../../data/integration";
import { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";

@customElement("ha-integration-header")
export class HaIntegrationHeader extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public banner!: string;

  @property() public localizedDomainName?: string;

  @property() public domain!: string;

  @property() public label!: string;

  @property() public manifest?: IntegrationManifest;

  protected render(): TemplateResult {
    let primary: string;
    let secondary: string | undefined;

    const domainName =
      this.localizedDomainName ||
      domainToName(this.hass.localize, this.domain, this.manifest);

    if (this.label) {
      primary = this.label;
      secondary = primary === domainName ? undefined : domainName;
    } else {
      primary = domainName;
    }

    const icons: [string, string][] = [];

    if (this.manifest) {
      if (!this.manifest.is_built_in) {
        icons.push([
          mdiPackageVariant,
          this.hass.localize(
            "ui.panel.config.integrations.config_entry.provided_by_custom_integration"
          ),
        ]);
      }

      if (
        this.manifest.iot_class &&
        this.manifest.iot_class.startsWith("cloud_")
      ) {
        icons.push([
          mdiCloud,
          this.hass.localize(
            "ui.panel.config.integrations.config_entry.depends_on_cloud"
          ),
        ]);
      }
    }

    return html`
      ${!this.banner
        ? ""
        : html`<div class="banner">
            ${this.banner}
          </div>`}
      <slot name="above-header"></slot>
      <div class="header">
        <img
          src=${brandsUrl(this.domain, "icon")}
          referrerpolicy="no-referrer"
          @error=${this._onImageError}
          @load=${this._onImageLoad}
        />
        <div class="info">
          <div class="primary">${primary}</div>
          ${secondary ? html`<div class="secondary">${secondary}</div>` : ""}
        </div>
        ${icons.length === 0
          ? ""
          : html`
              <div class="icons">
                ${icons.map(
                  ([icon, description]) => html`
                    <span>
                      <ha-svg-icon .path=${icon}></ha-svg-icon>
                      <paper-tooltip animation-delay="0"
                        >${description}</paper-tooltip
                      >
                    </span>
                  `
                )}
              </div>
            `}
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
    }
    .header {
      display: flex;
      position: relative;
      padding: 16px 8px 8px 16px;
    }
    .header img {
      margin-right: 16px;
      width: 40px;
      height: 40px;
    }
    .header .info {
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
    .primary {
      font-size: 16px;
      font-weight: 400;
      color: var(--primary-text-color);
    }
    .secondary {
      font-size: 14px;
      color: var(--secondary-text-color);
    }
    .icons {
      position: absolute;
      top: 0px;
      right: 16px;
      color: var(--text-on-state-color, var(--secondary-text-color));
      background-color: var(--state-color, #e0e0e0);
      border-bottom-left-radius: 4px;
      border-bottom-right-radius: 4px;
      padding: 1px 4px 2px;
    }
    .icons ha-svg-icon {
      width: 20px;
      height: 20px;
    }
    paper-tooltip {
      white-space: nowrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-header": HaIntegrationHeader;
  }
}
