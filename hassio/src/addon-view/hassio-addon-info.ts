import "@material/mwc-button";
import "@polymer/iron-icon/iron-icon";
import "@polymer/paper-card/paper-card";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";

import "../../../src/components/buttons/ha-call-api-button";
import "../../../src/components/ha-label-badge";
import "../../../src/components/ha-markdown";
import "../../../src/components/ha-switch";
import "../components/hassio-card-content";

import { fireEvent } from "../../../src/common/dom/fire_event";
import {
  HassioAddonDetails,
  HassioAddonSetOptionParams,
  HassioAddonSetSecurityParams,
  setHassioAddonOption,
  setHassioAddonSecurity,
  uninstallHassioAddon,
  installHassioAddon,
  fetchHassioAddonChangelog,
} from "../../../src/data/hassio/addon";
import { hassioStyle } from "../resources/hassio-style";
import { haStyle } from "../../../src/resources/styles";
import { HomeAssistant } from "../../../src/types";
import { navigate } from "../../../src/common/navigate";
import { showHassioMarkdownDialog } from "../dialogs/markdown/show-dialog-hassio-markdown";

const PERMIS_DESC = {
  rating: {
    title: "Add-on Security Rating",
    description:
      "Hass.io provides a security rating to each of the add-ons, which indicates the risks involved when using this add-on. The more access an add-on requires on your system, the lower the score, thus raising the possible security risks.\n\nA score is on a scale from 1 to 6. Where 1 is the lowest score (considered the most insecure and highest risk) and a score of 6 is the highest score (considered the most secure and lowest risk).",
  },
  host_network: {
    title: "Host Network",
    description:
      "Add-ons usually run in their own isolated network layer, which prevents them from accessing the network of the host operating system. In some cases, this network isolation can limit add-ons in providing their services and therefore, the isolation can be lifted by the add-on author, giving the add-on full access to the network capabilities of the host machine. This gives the add-on more networking capabilities but lowers the security, hence, the security rating of the add-on will be lowered when this option is used by the add-on.",
  },
  homeassistant_api: {
    title: "Home Assistant API Access",
    description:
      "This add-on is allowed to access your running Home Assistant instance directly via the Home Assistant API. This mode handles authentication for the add-on as well, which enables an add-on to interact with Home Assistant without the need for additional authentication tokens.",
  },
  full_access: {
    title: "Full Hardware Access",
    description:
      "This add-on is given full access to the hardware of your system, by request of the add-on author. Access is comparable to the privileged mode in Docker. Since this opens up possible security risks, this feature impacts the add-on security score negatively.\n\nThis level of access is not granted automatically and needs to be confirmed by you. To do this, you need to disable the protection mode on the add-on manually. Only disable the protection mode if you know, need AND trust the source of this add-on.",
  },
  hassio_api: {
    title: "Hass.io API Access",
    description:
      "The add-on was given access to the Hass.io API, by request of the add-on author. By default, the add-on can access general version information of your system. When the add-on requests 'manager' or 'admin' level access to the API, it will gain access to control multiple parts of your Hass.io system. This permission is indicated by this badge and will impact the security score of the addon negatively.",
  },
  docker_api: {
    title: "Full Docker Access",
    description:
      "The add-on author has requested the add-on to have management access to the Docker instance running on your system. This mode gives the add-on full access and control to your entire Hass.io system, which adds security risks, and could damage your system when misused. Therefore, this feature impacts the add-on security score negatively.\n\nThis level of access is not granted automatically and needs to be confirmed by you. To do this, you need to disable the protection mode on the add-on manually. Only disable the protection mode if you know, need AND trust the source of this add-on.",
  },
  host_pid: {
    title: "Host Processes Namespace",
    description:
      "Usually, the processes the add-on runs, are isolated from all other system processes. The add-on author has requested the add-on to have access to the system processes running on the host system instance, and allow the add-on to spawn processes on the host system as well. This mode gives the add-on full access and control to your entire Hass.io system, which adds security risks, and could damage your system when misused. Therefore, this feature impacts the add-on security score negatively.\n\nThis level of access is not granted automatically and needs to be confirmed by you. To do this, you need to disable the protection mode on the add-on manually. Only disable the protection mode if you know, need AND trust the source of this add-on.",
  },
  apparmor: {
    title: "AppArmor",
    description:
      "AppArmor ('Application Armor') is a Linux kernel security module that restricts add-ons capabilities like network access, raw socket access, and permission to read, write, or execute specific files.\n\nAdd-on authors can provide their security profiles, optimized for the add-on, or request it to be disabled. If AppArmor is disabled, it will raise security risks and therefore, has a negative impact on the security score of the add-on.",
  },
  auth_api: {
    title: "Home Assistant Authentication",
    description:
      "An add-on can authenticate users against Home Assistant, allowing add-ons to give users the possibility to log into applications running inside add-ons, using their Home Assistant username/password. This badge indicates if the add-on author requests this capability.",
  },
  ingress: {
    title: "Ingress",
    description:
      "This add-on is using Ingress to embed its interface securely into Home Assistant.",
  },
};

@customElement("hassio-addon-info")
class HassioAddonInfo extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() public addon!: HassioAddonDetails;
  @property() private _error?: string;

  protected render(): TemplateResult {
    return html`
      ${
        this._computeUpdateAvailable
          ? html`
              <paper-card heading="Update available! 🎉">
                <div class="card-content">
                  <hassio-card-content
                    .hass=${this.hass}
                    .title="${this.addon.name} ${this.addon
                      .last_version} is available"
                    .description="You are currently running version ${this.addon
                      .version}"
                    icon="hassio:arrow-up-bold-circle"
                    iconClass="update"
                  ></hassio-card-content>
                  ${!this.addon.available
                    ? html`
                        <p>
                          This update is no longer compatible with your system.
                        </p>
                      `
                    : ""}
                </div>
                <div class="card-actions">
                  <ha-call-api-button
                    .hass=${this.hass}
                    .disabled=${!this.addon.available}
                    path="hassio/addons/${this.addon.slug}/update"
                  >
                    Update
                  </ha-call-api-button>
                  ${this.addon.changelog
                    ? html`
                        <mwc-button @click=${this._openChangelog}>
                          Changelog
                        </mwc-button>
                      `
                    : ""}
                </div>
              </paper-card>
            `
          : ""
      }

      ${
        !this.addon.protected
          ? html`
        <paper-card heading="Warning: Protection mode is disabled!" class="warning">
          <div class="card-content">
            Protection mode on this add-on is disabled! This gives the add-on full access to the entire system, which adds security risks, and could damage your system when used incorrectly. Only disable the protection mode if you know, need AND trust the source of this add-on.
          </div>
          <div class="card-actions protection-enable">
              <mwc-button @click=${this._protectionToggled}>Enable Protection mode</mwc-button>
            </div>
          </div>
        </paper-card>
      `
          : ""
      }

      <paper-card>
        <div class="card-content">
          <div class="addon-header">
            ${this.addon.name}
            <div class="addon-version light-color">
            ${
              this.addon.version
                ? html`
                    ${this.addon.version}
                    ${this._computeIsRunning
                      ? html`
                          <iron-icon
                            title="Add-on is running"
                            class="running"
                            icon="hassio:circle"
                          ></iron-icon>
                        `
                      : html`
                          <iron-icon
                            title="Add-on is stopped"
                            class="stopped"
                            icon="hassio:circle"
                          ></iron-icon>
                        `}
                  `
                : html`
                    ${this.addon.last_version}
                  `
            }
            </div>
          </div>
          <div class="description light-color">
            ${this.addon.description}.<br />
            Visit <a href=${this.addon.url}" target="_blank">
              ${this.addon.name} page
            </a> for details.
          </div>
          ${
            this.addon.logo
              ? html`
                  <a href="${this.addon.url}" target="_blank" class="logo">
                    <img src="/api/hassio/addons/${this.addon.slug}/logo" />
                  </a>
                `
              : ""
          }
          <div class="security">
            <ha-label-badge
              class=${classMap({
                green: [5, 6].includes(Number(this.addon.rating)),
                yellow: [3, 4].includes(Number(this.addon.rating)),
                red: [1, 2].includes(Number(this.addon.rating)),
              })}
              @click=${this._showMoreInfo}
              id="rating"
              .value=${this.addon.rating}
              label="rating"
              description=""
            ></ha-label-badge>
            ${
              this.addon.host_network
                ? html`
                    <ha-label-badge
                      @click=${this._showMoreInfo}
                      id="host_network"
                      icon="hassio:network"
                      label="host"
                      description=""
                    ></ha-label-badge>
                  `
                : ""
            }

            ${
              this.addon.full_access
                ? html`
                    <ha-label-badge
                      @click=${this._showMoreInfo}
                      id="full_access"
                      icon="hassio:chip"
                      label="hardware"
                      description=""
                    ></ha-label-badge>
                  `
                : ""
            }

            ${
              this.addon.homeassistant_api
                ? html`
                    <ha-label-badge
                      @click=${this._showMoreInfo}
                      id="homeassistant_api"
                      icon="hassio:home-assistant"
                      label="hass"
                      description=""
                    ></ha-label-badge>
                  `
                : ""
            }

            ${
              this._computeHassioApi
                ? html`
                    <ha-label-badge
                      @click=${this._showMoreInfo}
                      id="hassio_api"
                      icon="hassio:home-assistant"
                      label="hassio"
                      .description=${this.addon.hassio_role}
                    ></ha-label-badge>
                  `
                : ""
            }

            ${
              this.addon.docker_api
                ? html`
                    <ha-label-badge
                      @click=${this._showMoreInfo}
                      id="docker_api"
                      icon="hassio:docker"
                      label="docker"
                      description=""
                    ></ha-label-badge>
                  `
                : ""
            }

            ${
              this.addon.host_pid
                ? html`
                    <ha-label-badge
                      @click=${this._showMoreInfo}
                      id="host_pid"
                      icon="hassio:pound"
                      label="host pid"
                      description=""
                    ></ha-label-badge>
                  `
                : ""
            }

            ${
              this.addon.apparmor
                ? html`
                    <ha-label-badge
                      @click=${this._showMoreInfo}
                      class=${this._computeApparmorClassName}
                      id="apparmor"
                      icon="hassio:shield"
                      label="apparmor"
                      description=""
                    ></ha-label-badge>
                  `
                : ""
            }

            ${
              this.addon.auth_api
                ? html`
                    <ha-label-badge
                      @click=${this._showMoreInfo}
                      id="auth_api"
                      icon="hassio:key"
                      label="auth"
                      description=""
                    ></ha-label-badge>
                  `
                : ""
            }

            ${
              this.addon.ingress
                ? html`
                    <ha-label-badge
                      @click=${this._showMoreInfo}
                      id="ingress"
                      icon="hassio:cursor-default-click-outline"
                      label="ingress"
                      description=""
                    ></ha-label-badge>
                  `
                : ""
            }
          </div>

          ${
            this.addon.version
              ? html`
                  <div class="state">
                    <div>Start on boot</div>
                    <ha-switch
                      @change=${this._startOnBootToggled}
                      .checked=${this.addon.boot === "auto"}
                    ></ha-switch>
                  </div>
                  <div class="state">
                    <div>Auto update</div>
                    <ha-switch
                      @change=${this._autoUpdateToggled}
                      .checked=${this.addon.auto_update}
                    ></ha-switch>
                  </div>
                  ${this.addon.ingress
                    ? html`
                        <div class="state">
                          <div>Show in sidebar</div>
                          <ha-switch
                            @change=${this._panelToggled}
                            .checked=${this.addon.ingress_panel}
                            .disabled=${this._computeCannotIngressSidebar}
                          ></ha-switch>
                          ${this._computeCannotIngressSidebar
                            ? html`
                                <span>
                                  This option requires Home Assistant 0.92 or
                                  later.
                                </span>
                              `
                            : ""}
                        </div>
                      `
                    : ""}
                  ${this._computeUsesProtectedOptions
                    ? html`
                        <div class="state">
                          <div>
                            Protection mode
                            <span>
                              <iron-icon icon="hassio:information"></iron-icon>
                              <paper-tooltip>
                                Grant the add-on elevated system access.
                              </paper-tooltip>
                            </span>
                          </div>
                          <ha-switch
                            @change=${this._protectionToggled}
                            .checked=${this.addon.protected}
                          ></ha-switch>
                        </div>
                      `
                    : ""}
                `
              : ""
          }
          ${
            this._error
              ? html`
                  <div class="errors">${this._error}</div>
                `
              : ""
          }
        </div>
        <div class="card-actions">
        ${
          this.addon.version
            ? html`
                <mwc-button class="warning" @click=${this._uninstallClicked}>
                  Uninstall
                </mwc-button>
                ${this.addon.build
                  ? html`
                      <ha-call-api-button
                        class="warning"
                        .hass=${this.hass}
                        .path="hassio/addons/${this.addon.slug}/rebuild"
                      >
                        Rebuild
                      </ha-call-api-button>
                    `
                  : ""}
                ${this._computeIsRunning
                  ? html`
                      <ha-call-api-button
                        class="warning"
                        .hass=${this.hass}
                        .path="hassio/addons/${this.addon.slug}/restart"
                      >
                        Restart
                      </ha-call-api-button>
                      <ha-call-api-button
                        class="warning"
                        .hass=${this.hass}
                        .path="hassio/addons/${this.addon.slug}/stop"
                      >
                        Stop
                      </ha-call-api-button>
                    `
                  : html`
                      <ha-call-api-button
                        .hass=${this.hass}
                        .path="hassio/addons/${this.addon.slug}/start"
                      >
                        Start
                      </ha-call-api-button>
                    `}
                ${this._computeShowWebUI
                  ? html`
                      <a
                        .href=${this._pathWebui}
                        tabindex="-1"
                        target="_blank"
                        class="right"
                      >
                        <mwc-button>
                          Open web UI
                        </mwc-button>
                      </a>
                    `
                  : ""}
                ${this._computeShowIngressUI
                  ? html`
                      <mwc-button class="right" @click=${this._openIngress}>
                        Open web UI
                      </mwc-button>
                    `
                  : ""}
              `
            : html`
                ${!this.addon.available
                  ? html`
                      <p class="warning">
                        This add-on is not available on your system.
                      </p>
                    `
                  : ""}
                <mwc-button
                  .disabled=${!this.addon.available}
                  class="right"
                  @click=${this._installClicked}
                >
                  Install
                </mwc-button>
              `
        }
        </div>
      </paper-card>

      ${
        this.addon.long_description
          ? html`
              <paper-card>
                <div class="card-content">
                  <ha-markdown
                    .content=${this.addon.long_description}
                  ></ha-markdown>
                </div>
              </paper-card>
            `
          : ""
      }
    `;
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        :host {
          display: block;
        }
        paper-card {
          display: block;
          margin-bottom: 16px;
        }
        paper-card.warning {
          background-color: var(--google-red-500);
          color: white;
          --paper-card-header-color: white;
        }
        paper-card.warning mwc-button {
          --mdc-theme-primary: white !important;
        }
        .warning {
          color: var(--google-red-500);
          --mdc-theme-primary: var(--google-red-500);
        }
        .light-color {
          color: var(--secondary-text-color);
        }
        .addon-version {
          float: right;
          font-size: 15px;
          vertical-align: middle;
        }
        .errors {
          color: var(--google-red-500);
          margin-bottom: 16px;
        }
        .description {
          margin-bottom: 16px;
        }
        .logo img {
          max-height: 60px;
          margin: 16px 0;
          display: block;
        }
        .state {
          display: flex;
          margin: 33px 0;
        }
        .state div {
          width: 180px;
          display: inline-block;
        }
        .state iron-icon {
          width: 16px;
          height: 16px;
          color: var(--secondary-text-color);
        }
        ha-switch {
          display: flex;
        }
        iron-icon.running {
          color: var(--paper-green-400);
        }
        iron-icon.stopped {
          color: var(--google-red-300);
        }
        ha-call-api-button {
          font-weight: 500;
          color: var(--primary-color);
        }
        .right {
          float: right;
        }
        ha-markdown img {
          max-width: 100%;
        }
        protection-enable mwc-button {
          --mdc-theme-primary: white;
        }
        .description a,
        ha-markdown a {
          color: var(--primary-color);
        }
        .red {
          --ha-label-badge-color: var(--label-badge-red, #df4c1e);
        }
        .blue {
          --ha-label-badge-color: var(--label-badge-blue, #039be5);
        }
        .green {
          --ha-label-badge-color: var(--label-badge-green, #0da035);
        }
        .yellow {
          --ha-label-badge-color: var(--label-badge-yellow, #f4b400);
        }
        .security {
          margin-bottom: 16px;
        }
        .card-actions {
          display: flow-root;
        }
        .security h3 {
          margin-bottom: 8px;
          font-weight: normal;
        }
        .security ha-label-badge {
          cursor: pointer;
          margin-right: 4px;
          --iron-icon-height: 45px;
        }
      `,
    ];
  }

  private get _computeHassioApi(): boolean {
    return (
      this.addon.hassio_api &&
      (this.addon.hassio_role === "manager" ||
        this.addon.hassio_role === "admin")
    );
  }

  private get _computeApparmorClassName(): string {
    if (this.addon.apparmor === "profile") {
      return "green";
    }
    if (this.addon.apparmor === "disable") {
      return "red";
    }
    return "";
  }

  private _showMoreInfo(ev): void {
    const id = ev.target.getAttribute("id");
    showHassioMarkdownDialog(this, {
      title: PERMIS_DESC[id].title,
      content: PERMIS_DESC[id].description,
    });
  }

  private get _computeIsRunning(): boolean {
    return this.addon?.state === "started";
  }

  private get _computeUpdateAvailable(): boolean | "" {
    return (
      this.addon &&
      !this.addon.detached &&
      this.addon.version &&
      this.addon.version !== this.addon.last_version
    );
  }

  private get _pathWebui(): string | null {
    return (
      this.addon.webui &&
      this.addon.webui.replace("[HOST]", document.location.hostname)
    );
  }

  private get _computeShowWebUI(): boolean | "" | null {
    return !this.addon.ingress && this.addon.webui && this._computeIsRunning;
  }

  private _openIngress(): void {
    navigate(this, `/hassio/ingress/${this.addon.slug}`);
  }

  private get _computeShowIngressUI(): boolean {
    return this.addon.ingress && this._computeIsRunning;
  }

  private get _computeCannotIngressSidebar(): boolean {
    return !this.addon.ingress || !this._computeHA92plus;
  }

  private get _computeUsesProtectedOptions(): boolean {
    return (
      this.addon.docker_api || this.addon.full_access || this.addon.host_pid
    );
  }

  private get _computeHA92plus(): boolean {
    const [major, minor] = this.hass.config.version.split(".", 2);
    return Number(major) > 0 || (major === "0" && Number(minor) >= 92);
  }

  private async _startOnBootToggled(): Promise<void> {
    this._error = undefined;
    const data: HassioAddonSetOptionParams = {
      boot: this.addon.boot === "auto" ? "manual" : "auto",
    };
    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      this._error = `Failed to set addon option, ${err.body?.message || err}`;
    }
  }

  private async _autoUpdateToggled(): Promise<void> {
    this._error = undefined;
    const data: HassioAddonSetOptionParams = {
      auto_update: !this.addon.auto_update,
    };
    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      this._error = `Failed to set addon option, ${err.body?.message || err}`;
    }
  }

  private async _protectionToggled(): Promise<void> {
    this._error = undefined;
    const data: HassioAddonSetSecurityParams = {
      protected: !this.addon.protected,
    };
    try {
      await setHassioAddonSecurity(this.hass, this.addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "security",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      this._error = `Failed to set addon security option, ${err.body?.message ||
        err}`;
    }
  }

  private async _panelToggled(): Promise<void> {
    this._error = undefined;
    const data: HassioAddonSetOptionParams = {
      ingress_panel: !this.addon.ingress_panel,
    };
    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      this._error = `Failed to set addon option, ${err.body?.message || err}`;
    }
  }

  private async _openChangelog(): Promise<void> {
    this._error = undefined;
    try {
      const content = await fetchHassioAddonChangelog(
        this.hass,
        this.addon.slug
      );
      showHassioMarkdownDialog(this, {
        title: "Changelog",
        content,
      });
    } catch (err) {
      this._error = `Failed to get addon changelog, ${err.body?.message ||
        err}`;
    }
  }

  private async _installClicked(): Promise<void> {
    this._error = undefined;
    try {
      await installHassioAddon(this.hass, this.addon.slug);
      const eventdata = {
        success: true,
        response: undefined,
        path: "install",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      this._error = `Failed to install addon, ${err.body?.message || err}`;
    }
  }

  private async _uninstallClicked(): Promise<void> {
    if (!confirm("Are you sure you want to uninstall this add-on?")) {
      return;
    }
    this._error = undefined;
    try {
      await uninstallHassioAddon(this.hass, this.addon.slug);
      const eventdata = {
        success: true,
        response: undefined,
        path: "uninstall",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      this._error = `Failed to uninstall addon, ${err.body?.message || err}`;
    }
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-info": HassioAddonInfo;
  }
}
