import { mdiCloud, mdiPackageVariant, mdiSyncOff } from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import { css, html, LitElement, TemplateResult } from "lit";
import { customElement, property } from "lit/decorators";
import "../../../components/ha-svg-icon";
import { ConfigEntry } from "../../../data/config_entries";
import { domainToName, IntegrationManifest } from "../../../data/integration";
import { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";

@customElement("ha-integration-header")
export class HaIntegrationHeader extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public banner?: string;

  @property() public localizedDomainName?: string;

  @property() public domain!: string;

  @property() public label?: string;

  @property({ attribute: false }) public manifest?: IntegrationManifest;

  @property({ attribute: false }) public configEntry?: ConfigEntry;

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

      if (this.configEntry?.pref_disable_polling) {
        icons.push([
          mdiSyncOff,
          this.hass.localize(
            "ui.panel.config.integrations.config_entry.disabled_polling"
          ),
        ]);
      }
    }

    return html`
      ${!this.banner ? "" : html`<div class="banner">${this.banner}</div>`}
      <slot name="above-header"></slot>
      <div class="header">
        <img
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
      border-top-left-radius: var(--ha-card-border-radius, 4px);
      border-top-right-radius: var(--ha-card-border-radius, 4px);
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
    .primary {
      font-size: 16px;
      margin-top: 16px;
      margin-right: 2px;
      font-weight: 400;
      word-break: break-word;
      color: var(--primary-text-color);
    }
    .secondary {
      font-size: 14px;
      color: var(--secondary-text-color);
    }
    .icons {
      margin-right: 8px;
      margin-left: auto;
      height: 28px;
      color: var(--text-on-state-color, var(--secondary-text-color));
      background-color: var(--state-color, #e0e0e0);
      border-bottom-left-radius: 4px;
      border-bottom-right-radius: 4px;
      display: flex;
      float: right;
    }
    .icons ha-svg-icon {
      width: 20px;
      height: 20px;
      margin: 4px;
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
