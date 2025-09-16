import {
  mdiBug,
  mdiFileDocument,
  mdiHandsPray,
  mdiHelp,
  mdiKeyboard,
  mdiNewspaperVariant,
  mdiOpenInNew,
  mdiTshirtCrew,
} from "@mdi/js";
import type { CSSResultGroup, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-card";
import "../../../components/ha-icon-next";
import "../../../components/ha-list";
import "../../../components/ha-list-item";
import "../../../components/ha-logo-svg";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import type { HassioHassOSInfo } from "../../../data/hassio/host";
import { fetchHassioHassOsInfo } from "../../../data/hassio/host";
import type { HassioInfo } from "../../../data/hassio/supervisor";
import { fetchHassioInfo } from "../../../data/hassio/supervisor";
import { showShortcutsDialog } from "../../../dialogs/shortcuts/show-shortcuts-dialog";
import "../../../layouts/hass-subpage";
import { mdiHomeAssistant } from "../../../resources/home-assistant-logo-svg";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import { subscribeSystemHealthInfo } from "../../../data/system_health";

const JS_TYPE = __BUILD__;
const JS_VERSION = __VERSION__;

const PAGES = [
  {
    name: "change_log",
    path: "/latest-release-notes/",
    iconPath: mdiNewspaperVariant,
    iconColor: "#4A5963",
  },
  {
    name: "thanks",
    path: "/developers/credits/",
    iconPath: mdiHandsPray,
    iconColor: "#3B808E",
  },
  {
    name: "merch",
    path: "/merch",
    iconPath: mdiTshirtCrew,
    iconColor: "#C65326",
  },
  {
    name: "feature",
    path: "/feature-requests",
    iconPath: mdiHomeAssistant,
    iconColor: "#0D47A1",
  },
  {
    name: "bug",
    path: "/issues",
    iconPath: mdiBug,
    iconColor: "#F1C447",
  },
  {
    name: "help",
    path: "/community",
    iconPath: mdiHelp,
    iconColor: "#B1345C",
  },
  {
    name: "license",
    path: "/developers/license/",
    iconPath: mdiFileDocument,
    iconColor: "#518C43",
  },
] as const satisfies readonly {
  name: string;
  path: string;
  iconPath: string;
  iconColor: string;
}[];

@customElement("ha-config-info")
class HaConfigInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public showAdvanced = false;

  @property({ attribute: false }) public route!: Route;

  @state() private _osInfo?: HassioHassOSInfo;

  @state() private _externalAppVersion?: string;

  @state() private _hassioInfo?: HassioInfo;

  @state() private _installationMethod?: string;

  protected render(): TemplateResult {
    const hass = this.hass;
    const customUiList: { name: string; url: string; version: string }[] =
      (window as any).CUSTOM_UI_LIST || [];

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        back-path="/config"
        .header=${this.hass.localize("ui.panel.config.info.caption")}
      >
        <div class="content">
          <ha-card outlined class="header">
            <a
              href=${documentationUrl(this.hass, "")}
              target="_blank"
              rel="noreferrer"
            >
              <ha-logo-svg
                title=${this.hass.localize(
                  "ui.panel.config.info.home_assistant_logo"
                )}
              >
              </ha-logo-svg>
            </a>
            <p>Home Assistant</p>
            <ul class="versions">
              <li>
                <span class="version-label"
                  >${this.hass.localize(
                    `ui.panel.config.info.installation_method`
                  )}</span
                >
                <span class="version">${this._installationMethod || "…"}</span>
              </li>
              <li>
                <span class="version-label">Core</span>
                <span class="version">${hass.connection.haVersion}</span>
              </li>
              ${this._hassioInfo
                ? html`
                    <li>
                      <span class="version-label">Supervisor</span>
                      <span class="version"
                        >${this._hassioInfo.supervisor}</span
                      >
                    </li>
                  `
                : nothing}
              ${this._osInfo
                ? html`
                    <li>
                      <span class="version-label">Operating System</span>
                      <span class="version">${this._osInfo.version}</span>
                    </li>
                  `
                : nothing}
              <li>
                <span class="version-label">
                  ${this.hass.localize(
                    "ui.panel.config.info.frontend_version_label"
                  )}
                </span>
                <span class="version">
                  ${JS_VERSION}${JS_TYPE !== "modern" ? ` · ${JS_TYPE}` : ""}
                </span>
              </li>
              ${this._externalAppVersion
                ? html`
                    <li>
                      <span class="version-label"
                        >${this.hass.localize(
                          `ui.panel.config.info.external_app_version`
                        )}</span
                      >
                      <span class="version">${this._externalAppVersion}</span>
                    </li>
                  `
                : nothing}
            </ul>
          </ha-card>
          <ha-card outlined class="ohf">
            <div>
              ${this.hass.localize("ui.panel.config.info.proud_part_of")}
            </div>
            <a
              href="https://www.openhomefoundation.org"
              target="_blank"
              rel="noreferrer"
            >
              <img src="/static/icons/ohf.svg" alt="Open Home Foundation" />
            </a>
          </ha-card>

          <ha-card outlined class="pages">
            <ha-md-list>
              <ha-md-list-item type="button" @click=${this._showShortcuts}>
                <div
                  slot="start"
                  class="icon-background"
                  style="background-color: #9e4dd1;"
                >
                  <ha-svg-icon .path=${mdiKeyboard}></ha-svg-icon>
                </div>
                <span
                  >${this.hass.localize("ui.panel.config.info.shortcuts")}</span
                >
              </ha-md-list-item>

              ${PAGES.map(
                (page) => html`
                  <ha-md-list-item
                    type="link"
                    .href=${documentationUrl(this.hass, page.path)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <div
                      slot="start"
                      class="icon-background"
                      .style="background-color: ${page.iconColor}"
                    >
                      <ha-svg-icon .path=${page.iconPath}></ha-svg-icon>
                    </div>
                    <span>
                      ${this.hass.localize(
                        `ui.panel.config.info.items.${page.name}`
                      )}
                    </span>
                    <ha-svg-icon slot="end" .path=${mdiOpenInNew}></ha-svg-icon>
                  </ha-md-list-item>
                `
              )}
            </ha-md-list>
            ${customUiList.length
              ? html`
                  <div class="custom-ui">
                    ${this.hass.localize("ui.panel.config.info.custom_uis")}
                    ${customUiList.map(
                      (item) => html`
                        <div>
                          <a href=${item.url} target="_blank"> ${item.name}</a>:
                          ${item.version}
                        </div>
                      `
                    )}
                  </div>
                `
              : nothing}
          </ha-card>
        </div>
      </hass-subpage>
    `;
  }

  protected firstUpdated(changedProps): void {
    super.firstUpdated(changedProps);

    // Legacy custom UI can be slow to register, give them time.
    const customUI = ((window as any).CUSTOM_UI_LIST || []).length;
    setTimeout(() => {
      if (((window as any).CUSTOM_UI_LIST || []).length !== customUI.length) {
        this.requestUpdate();
      }
    }, 2000);

    if (isComponentLoaded(this.hass, "hassio")) {
      this._loadSupervisorInfo();
    }

    this._externalAppVersion = this.hass.auth.external?.config.appVersion;

    const unsubSystemHealth = subscribeSystemHealthInfo(this.hass, (info) => {
      if (info?.homeassistant) {
        this._installationMethod = info.homeassistant.info.installation_type;
        unsubSystemHealth.then((unsub) => unsub());
      }
    });
  }

  private async _loadSupervisorInfo(): Promise<void> {
    const [osInfo, hassioInfo] = await Promise.all([
      fetchHassioHassOsInfo(this.hass),
      fetchHassioInfo(this.hass),
    ]);

    this._hassioInfo = hassioInfo;
    this._osInfo = osInfo;
  }

  private _showShortcuts(ev): void {
    ev.stopPropagation();
    showShortcutsDialog(this);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          padding: 28px 20px 0;
          max-width: 1040px;
          margin: 0 auto;
        }

        ha-logo-svg {
          height: 56px;
          width: 56px;
        }

        ha-card {
          max-width: 600px;
          margin: 0 auto;
          margin-bottom: 16px;
          padding: 16px;
        }

        .header {
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          padding: 32px 8px 16px 8px;
        }

        .header p {
          font-size: var(--ha-font-size-xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          text-align: center;
          margin: 24px;
        }

        .ohf {
          text-align: center;
          padding-bottom: 5px;
        }

        .ohf img {
          width: 100%;
          max-width: 250px;
        }

        .versions {
          display: flex;
          flex-direction: column;
          color: var(--secondary-text-color);
          align-self: stretch;
          justify-content: flex-start;
          padding: 0 12px;
          margin: 0;
        }

        .versions li {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-normal);
          padding: 4px 0;
        }

        .version-label {
          color: var(--primary-text-color);
        }

        .version {
          color: var(--secondary-text-color);
        }

        .ha-version {
          color: var(--primary-text-color);
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-medium);
        }

        .pages {
          margin-bottom: max(24px, var(--safe-area-inset-bottom));
          padding: 4px 0;
        }

        .icon-background ha-svg-icon {
          height: 24px;
          width: 24px;
          display: block;
          padding: 8px;
          color: #fff;
        }

        .icon-background {
          border-radius: 50%;
        }

        .custom-ui {
          color: var(--secondary-text-color);
          text-align: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-info": HaConfigInfo;
  }
}
