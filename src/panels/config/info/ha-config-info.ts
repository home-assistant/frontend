import "@material/mwc-list/mwc-list";
import {
  mdiBug,
  mdiFileDocument,
  mdiHandsPray,
  mdiHelp,
  mdiHomeAssistant,
  mdiNewspaperVariant,
  mdiTshirtCrew,
} from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-card";
import "../../../components/ha-clickable-list-item";
import "../../../components/ha-logo-svg";
import {
  fetchHassioHassOsInfo,
  HassioHassOSInfo,
} from "../../../data/hassio/host";
import { fetchHassioInfo, HassioInfo } from "../../../data/hassio/supervisor";
import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";

const JS_TYPE = __BUILD__;
const JS_VERSION = __VERSION__;

const PAGES: Array<{
  name: string;
  path: string;
  iconPath: string;
  iconColor: string;
}> = [
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
];

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
          <ha-card outlined>
            <div class="logo-versions">
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
              <div class="versions">
                <span class="ha-version"
                  >Home Assistant ${hass.connection.haVersion}</span
                >
                ${this._hassioInfo
                  ? html`<span>Supervisor ${this._hassioInfo.supervisor}</span>`
                  : ""}
                ${this._osInfo?.version
                  ? html`<span>Operating System ${this._osInfo.version}</span>`
                  : ""}
                <span>
                  ${this.hass.localize(
                    "ui.panel.config.info.frontend_version",
                    "version",
                    JS_VERSION,
                    "type",
                    JS_TYPE
                  )}
                </span>
              </div>
            </div>
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
            ${!customUiList.length
              ? ""
              : html`
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
                `}
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
          padding: 12px;
          height: 150px;
          width: 150px;
        }

        ha-card {
          padding: 16px;
          max-width: 600px;
          margin: 0 auto;
          margin-bottom: 24px;
          margin-bottom: max(24px, env(safe-area-inset-bottom));
        }

        .logo-versions {
          display: flex;
          justify-content: flex-start;
          align-items: center;
        }

        .versions {
          display: flex;
          flex-direction: column;
          color: var(--secondary-text-color);
          padding: 12px 0;
          align-self: stretch;
          justify-content: flex-start;
        }

        .ha-version {
          color: var(--primary-text-color);
          font-weight: 500;
          font-size: 16px;
        }

        mwc-list {
          --mdc-list-side-padding: 4px;
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

        @media all and (max-width: 500px), all and (max-height: 500px) {
          ha-logo-svg {
            height: 100px;
            width: 100px;
          }
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

customElements.define("ha-config-info", HaConfigInfo);
