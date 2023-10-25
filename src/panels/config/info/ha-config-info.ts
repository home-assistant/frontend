import "@material/mwc-list/mwc-list";
import {
  mdiBug,
  mdiFileDocument,
  mdiHandsPray,
  mdiHelp,
  mdiNewspaperVariant,
  mdiTshirtCrew,
} from "@mdi/js";
import {
  CSSResultGroup,
  LitElement,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-card";
import "../../../components/ha-clickable-list-item";
import "../../../components/ha-logo-svg";
import {
  HassioHassOSInfo,
  fetchHassioHassOsInfo,
} from "../../../data/hassio/host";
import { HassioInfo, fetchHassioInfo } from "../../../data/hassio/supervisor";
import "../../../layouts/hass-subpage";
import { mdiHomeAssistant } from "../../../resources/home-assistant-logo-svg";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";

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

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public showAdvanced!: boolean;

  @property({ attribute: false }) public route!: Route;

  @state() private _osInfo?: HassioHassOSInfo;

  @state() private _hassioInfo?: HassioInfo;

  protected render(): TemplateResult {
    const hass = this.hass;
    const customUiList: Array<{ name: string; url: string; version: string }> =
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
                  ${JS_VERSION}${JS_TYPE !== "latest" ? ` ⸱ ${JS_TYPE}` : ""}
                </span>
              </li>
            </ul>
          </ha-card>
          <ha-card outlined class="pages">
            <mwc-list>
              ${PAGES.map(
                (page) => html`
                  <ha-clickable-list-item
                    graphic="avatar"
                    openNewTab
                    href=${documentationUrl(this.hass, page.path)}
                  >
                    <div
                      slot="graphic"
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
                  </ha-clickable-list-item>
                `
              )}
            </mwc-list>
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
  }

  private async _loadSupervisorInfo(): Promise<void> {
    const [osInfo, hassioInfo] = await Promise.all([
      fetchHassioHassOsInfo(this.hass),
      fetchHassioInfo(this.hass),
    ]);

    this._hassioInfo = hassioInfo;
    this._osInfo = osInfo;
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
          font-size: 22px;
          font-weight: 400;
          line-height: 28px;
          text-align: center;
          margin: 24px;
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
          font-size: 14px;
          font-weight: 400;
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
          font-weight: 500;
          font-size: 16px;
        }

        .pages {
          margin-bottom: max(24px, env(safe-area-inset-bottom));
          padding: 4px 0;
        }

        mwc-list {
          --mdc-list-side-padding: 16px;
          --mdc-list-vertical-padding: 0;
        }

        ha-clickable-list-item {
          height: 64px;
        }

        ha-svg-icon {
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
