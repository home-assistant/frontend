import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import { mdiCloud, mdiPackageVariant } from "@mdi/js";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { computeRTL } from "../../../common/util/compute_rtl";
import "../../../components/ha-svg-icon";
import { domainToName, IntegrationManifest } from "../../../data/integration";
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

  @property({ attribute: false }) public debugLoggingEnabled?: boolean;

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

    const icons: [string, string][] = [];

    if (this.manifest) {
      if (!this.manifest.is_built_in) {
        icons.push([
          mdiPackageVariant,
          this.hass.localize(
            "ui.panel.config.integrations.config_entry.custom_integration"
          ),
        ]);
      }

      if (this.manifest.iot_class?.startsWith("cloud_")) {
        icons.push([
          mdiCloud,
          this.hass.localize(
            "ui.panel.config.integrations.config_entry.depends_on_cloud"
          ),
        ]);
      }
    }

    return html`
      ${!this.banner ? "" : html`<div class="banner">${this.banner}</div>`}
      <slot name="above-header"></slot>
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
        ${icons.length === 0
          ? ""
          : html`
              <div
                class="icons ${classMap({
                  double: icons.length > 1,
                  cloud: Boolean(
                    this.manifest?.iot_class?.startsWith("cloud_")
                  ),
                })}"
              >
                ${icons.map(
                  ([icon, description]) => html`
                    <span>
                      <ha-svg-icon .path=${icon}></ha-svg-icon>
                      <simple-tooltip
                        animation-delay="0"
                        .position=${computeRTL(this.hass) ? "left" : "right"}
                        offset="4"
                        >${description}</simple-tooltip
                      >
                    </span>
                  `
                )}
              </div>
            `}
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
      padding-top: 0px;
      padding-bottom: 8px;
      padding-inline-start: 16px;
      padding-inline-end: 8px;
      direction: var(--direction);
    }
    .header img {
      margin-top: 16px;
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
      margin-top: 8px;
    }
    .primary {
      font-size: 16px;
      margin-top: 16px;
      font-weight: 400;
      word-break: break-word;
      color: var(--primary-text-color);
    }
    .secondary {
      font-size: 14px;
      color: var(--secondary-text-color);
    }
    .icons {
      background: var(--warning-color);
      border: 1px solid var(--card-background-color);
      border-radius: 14px;
      color: var(--text-primary-color);
      position: absolute;
      left: 40px;
      top: 40px;
      display: flex;
      padding: 4px;
      inset-inline-start: 40px;
      inset-inline-end: initial;
    }
    .icons.cloud {
      background: var(--info-color);
    }
    .icons.double {
      background: var(--warning-color);
      left: 28px;
      inset-inline-start: 28px;
      inset-inline-end: initial;
    }
    .icons ha-svg-icon {
      width: 16px;
      height: 16px;
      display: block;
    }
    .icons span:not(:first-child) ha-svg-icon {
      margin-left: 4px;
      margin-inline-start: 4px;
      margin-inline-end: inherit;
    }
    simple-tooltip {
      white-space: nowrap;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-integration-header": HaIntegrationHeader;
  }
}
