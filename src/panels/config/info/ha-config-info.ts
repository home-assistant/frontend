import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { property, state } from "lit/decorators";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import "../../../components/ha-logo-svg";
import {
  fetchHassioHostInfo,
  fetchHassioHassOsInfo,
  HassioHassOSInfo,
  HassioHostInfo,
} from "../../../data/hassio/host";
import { HassioInfo, fetchHassioInfo } from "../../../data/hassio/supervisor";
import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import "./integrations-card";

const JS_TYPE = __BUILD__;
const JS_VERSION = __VERSION__;

class HaConfigInfo extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public showAdvanced!: boolean;

  @property() public route!: Route;

  @state() private _hostInfo?: HassioHostInfo;

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
        <div class="about">
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
          <br />
          <h2>Home Assistant Core ${hass.connection.haVersion}</h2>
          ${this._hassioInfo
            ? html`<h2>
                Home Assistant Supervisor ${this._hassioInfo.supervisor}
              </h2>`
            : ""}
          ${this._osInfo
            ? html`<h2>Home Assistant OS ${this._osInfo.version}</h2>`
            : ""}
          ${this._hostInfo
            ? html`<h4>Kernel version ${this._hostInfo.kernel}</h4>
                <h4>Agent version ${this._hostInfo.agent_version}</h4>`
            : ""}
          <p>
            ${this.hass.localize(
              "ui.panel.config.info.path_configuration",
              "path",
              hass.config.config_dir
            )}
          </p>
          <p class="develop">
            <a
              href=${documentationUrl(this.hass, "/developers/credits/")}
              target="_blank"
              rel="noreferrer"
            >
              ${this.hass.localize("ui.panel.config.info.developed_by")}
            </a>
          </p>
          <p>
            ${this.hass.localize("ui.panel.config.info.license")}<br />
            ${this.hass.localize("ui.panel.config.info.source")}
            <a
              href="https://github.com/home-assistant/core"
              target="_blank"
              rel="noreferrer"
              >${this.hass.localize("ui.panel.config.info.server")}</a
            >
            &mdash;
            <a
              href="https://github.com/home-assistant/frontend"
              target="_blank"
              rel="noreferrer"
              >${this.hass.localize("ui.panel.config.info.frontend")}</a
            >
          </p>
          <p>
            ${this.hass.localize("ui.panel.config.info.built_using")}
            <a href="https://www.python.org" target="_blank" rel="noreferrer"
              >Python 3</a
            >,
            <a href="https://lit.dev" target="_blank" rel="noreferrer">Lit</a>,
            ${this.hass.localize("ui.panel.config.info.icons_by")}
            <a
              href="https://fonts.google.com/icons?selected=Material+Icons"
              target="_blank"
              rel="noreferrer"
              >Google</a
            >
            ${this.hass.localize("ui.common.and")}
            <a
              href="https://materialdesignicons.com/"
              target="_blank"
              rel="noreferrer"
              >Material Design Icons</a
            >.
          </p>
          <p>
            ${this.hass.localize(
              "ui.panel.config.info.frontend_version",
              "version",
              JS_VERSION,
              "type",
              JS_TYPE
            )}
            ${customUiList.length > 0
              ? html`
                  <div>
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
              : ""}
          </p>
        </div>
        <div>
          <integrations-card
            .hass=${this.hass}
            .narrow=${this.narrow}
          ></integrations-card>
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
    }, 1000);

    if (isComponentLoaded(this.hass, "hassio")) {
      this._loadSupervisorInfo();
    }
  }

  private async _loadSupervisorInfo(): Promise<void> {
    const [hostInfo, osInfo, hassioInfo] = await Promise.all([
      fetchHassioHostInfo(this.hass),
      fetchHassioHassOsInfo(this.hass),
      fetchHassioInfo(this.hass),
    ]);

    this._hassioInfo = hassioInfo;
    this._osInfo = osInfo;
    this._hostInfo = hostInfo;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          -ms-user-select: initial;
          -webkit-user-select: initial;
          -moz-user-select: initial;
        }

        .about {
          text-align: center;
          line-height: 2em;
        }

        .version {
          @apply --paper-font-headline;
        }

        .develop {
          @apply --paper-font-subhead;
        }

        .about a {
          color: var(--primary-color);
        }

        integrations-card {
          display: block;
          max-width: 600px;
          margin: 0 auto;
          padding-bottom: 16px;
        }
        ha-logo-svg {
          padding: 12px;
          height: 180px;
          width: 180px;
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
