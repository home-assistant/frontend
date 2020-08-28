import "@material/mwc-button";
import {
  mdiArrowUpBoldCircle,
  mdiCheckCircle,
  mdiChip,
  mdiCircle,
  mdiCursorDefaultClickOutline,
  mdiDocker,
  mdiExclamationThick,
  mdiFlask,
  mdiHomeAssistant,
  mdiKey,
  mdiNetwork,
  mdiPound,
  mdiShield,
} from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
} from "lit-element";
import { classMap } from "lit-html/directives/class-map";
import { atLeastVersion } from "../../../../src/common/config/version";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import { navigate } from "../../../../src/common/navigate";
import "../../../../src/components/buttons/ha-call-api-button";
import "../../../../src/components/buttons/ha-progress-button";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-label-badge";
import "../../../../src/components/ha-markdown";
import "../../../../src/components/ha-svg-icon";
import "../../../../src/components/ha-switch";
import {
  fetchHassioAddonChangelog,
  HassioAddonDetails,
  HassioAddonSetOptionParams,
  HassioAddonSetSecurityParams,
  installHassioAddon,
  setHassioAddonOption,
  setHassioAddonSecurity,
  uninstallHassioAddon,
} from "../../../../src/data/hassio/addon";
import { showConfirmationDialog } from "../../../../src/dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import "../../components/hassio-card-content";
import { showHassioMarkdownDialog } from "../../dialogs/markdown/show-dialog-hassio-markdown";
import { hassioStyle } from "../../resources/hassio-style";
import "../../../../src/components/ha-settings-row";

const STAGE_ICON = {
  stable: mdiCheckCircle,
  experimental: mdiFlask,
  deprecated: mdiExclamationThick,
};

const PERMIS_DESC = {
  stage: {
    title: "Add-on Stage",
    description: `Add-ons can have one of three stages:\n\n<ha-svg-icon path='${STAGE_ICON.stable}'></ha-svg-icon> **Stable**: These are add-ons ready to be used in production.\n\n<ha-svg-icon path='${STAGE_ICON.experimental}'></ha-svg-icon> **Experimental**: These may contain bugs, and may be unfinished.\n\n<ha-svg-icon path='${STAGE_ICON.deprecated}'></ha-svg-icon> **Deprecated**: These add-ons will no longer receive any updates.`,
  },
  rating: {
    title: "Add-on Security Rating",
    description:
      "Home Assistant provides a security rating to each of the add-ons, which indicates the risks involved when using this add-on. The more access an add-on requires on your system, the lower the score, thus raising the possible security risks.\n\nA score is on a scale from 1 to 6. Where 1 is the lowest score (considered the most insecure and highest risk) and a score of 6 is the highest score (considered the most secure and lowest risk).",
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
    title: "Supervisor API Access",
    description:
      "The add-on was given access to the Supervisor API, by request of the add-on author. By default, the add-on can access general version information of your system. When the add-on requests 'manager' or 'admin' level access to the API, it will gain access to control multiple parts of your Home Assistant system. This permission is indicated by this badge and will impact the security score of the addon negatively.",
  },
  docker_api: {
    title: "Full Docker Access",
    description:
      "The add-on author has requested the add-on to have management access to the Docker instance running on your system. This mode gives the add-on full access and control to your entire Home Assistant system, which adds security risks, and could damage your system when misused. Therefore, this feature impacts the add-on security score negatively.\n\nThis level of access is not granted automatically and needs to be confirmed by you. To do this, you need to disable the protection mode on the add-on manually. Only disable the protection mode if you know, need AND trust the source of this add-on.",
  },
  host_pid: {
    title: "Host Processes Namespace",
    description:
      "Usually, the processes the add-on runs, are isolated from all other system processes. The add-on author has requested the add-on to have access to the system processes running on the host system instance, and allow the add-on to spawn processes on the host system as well. This mode gives the add-on full access and control to your entire Home Assistant system, which adds security risks, and could damage your system when misused. Therefore, this feature impacts the add-on security score negatively.\n\nThis level of access is not granted automatically and needs to be confirmed by you. To do this, you need to disable the protection mode on the add-on manually. Only disable the protection mode if you know, need AND trust the source of this add-on.",
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
  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon!: HassioAddonDetails;

  @internalProperty() private _error?: string;

  @property({ type: Boolean }) private _installing = false;

  protected render(): TemplateResult {
    return html`
      ${this._computeUpdateAvailable
        ? html`
            <ha-card header="Update available! 🎉">
              <div class="card-content">
                <hassio-card-content
                  .hass=${this.hass}
                  .title="${this.addon.name} ${this.addon
                    .version_latest} is available"
                  .description="You are currently running version ${this.addon
                    .version}"
                  icon=${mdiArrowUpBoldCircle}
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
            </ha-card>
          `
        : ""}
      ${!this.addon.protected
        ? html`
        <ha-card class="warning">
          <div class="card-header">Warning: Protection mode is disabled!</div>
          <div class="card-content">
            Protection mode on this add-on is disabled! This gives the add-on full access to the entire system, which adds security risks, and could damage your system when used incorrectly. Only disable the protection mode if you know, need AND trust the source of this add-on.
          </div>
          <div class="card-actions protection-enable">
              <mwc-button @click=${this._protectionToggled}>Enable Protection mode</mwc-button>
            </div>
          </div>
        </ha-card>
      `
        : ""}

      <ha-card>
        <div class="card-content">
          <div class="addon-header">
            ${!this.narrow ? this.addon.name : ""}
            <div class="addon-version light-color">
              ${this.addon.version
                ? html`
                    ${this._computeIsRunning
                      ? html`
                          <ha-svg-icon
                            title="Add-on is running"
                            class="running"
                            path=${mdiCircle}
                          ></ha-svg-icon>
                        `
                      : html`
                          <ha-svg-icon
                            title="Add-on is stopped"
                            class="stopped"
                            path=${mdiCircle}
                          ></ha-svg-icon>
                        `}
                  `
                : html` ${this.addon.version_latest} `}
            </div>
          </div>
          <div class="description light-color">
            ${this.addon.version
              ? html`
                  Current version: ${this.addon.version}
                  <div class="changelog" @click=${this._openChangelog}>
                    (<span class="changelog-link">changelog</span>)
                  </div>
                `
              : html`<span class="changelog-link" @click=${this._openChangelog}
                  >Changelog</span
                >`}
          </div>

          <div class="description light-color">
            ${this.addon.description}.<br />
            Visit
            <a href="${this.addon.url!}" target="_blank" rel="noreferrer">
              ${this.addon.name} page</a
            >
            for details.
          </div>
          ${this.addon.logo
            ? html`
                <img
                  class="logo"
                  src="/api/hassio/addons/${this.addon.slug}/logo"
                />
              `
            : ""}
          <div class="security">
            ${this.addon.stage !== "stable"
              ? html` <ha-label-badge
                  class=${classMap({
                    yellow: this.addon.stage === "experimental",
                    red: this.addon.stage === "deprecated",
                  })}
                  @click=${this._showMoreInfo}
                  id="stage"
                  label="stage"
                  description=""
                >
                  <ha-svg-icon
                    .path=${STAGE_ICON[this.addon.stage]}
                  ></ha-svg-icon>
                </ha-label-badge>`
              : ""}

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
            ${this.addon.host_network
              ? html`
                  <ha-label-badge
                    @click=${this._showMoreInfo}
                    id="host_network"
                    label="host"
                    description=""
                  >
                    <ha-svg-icon path=${mdiNetwork}></ha-svg-icon>
                  </ha-label-badge>
                `
              : ""}
            ${this.addon.full_access
              ? html`
                  <ha-label-badge
                    @click=${this._showMoreInfo}
                    id="full_access"
                    label="hardware"
                    description=""
                  >
                    <ha-svg-icon path=${mdiChip}></ha-svg-icon>
                  </ha-label-badge>
                `
              : ""}
            ${this.addon.homeassistant_api
              ? html`
                  <ha-label-badge
                    @click=${this._showMoreInfo}
                    id="homeassistant_api"
                    label="hass"
                    description=""
                  >
                    <ha-svg-icon path=${mdiHomeAssistant}></ha-svg-icon>
                  </ha-label-badge>
                `
              : ""}
            ${this._computeHassioApi
              ? html`
                  <ha-label-badge
                    @click=${this._showMoreInfo}
                    id="hassio_api"
                    label="hassio"
                    .description=${this.addon.hassio_role}
                  >
                    <ha-svg-icon path=${mdiHomeAssistant}></ha-svg-icon>
                  </ha-label-badge>
                `
              : ""}
            ${this.addon.docker_api
              ? html`
                  <ha-label-badge
                    @click=${this._showMoreInfo}
                    id="docker_api"
                    label="docker"
                    description=""
                  >
                    <ha-svg-icon path=${mdiDocker}></ha-svg-icon>
                  </ha-label-badge>
                `
              : ""}
            ${this.addon.host_pid
              ? html`
                  <ha-label-badge
                    @click=${this._showMoreInfo}
                    id="host_pid"
                    label="host pid"
                    description=""
                  >
                    <ha-svg-icon path=${mdiPound}></ha-svg-icon>
                  </ha-label-badge>
                `
              : ""}
            ${this.addon.apparmor
              ? html`
                  <ha-label-badge
                    @click=${this._showMoreInfo}
                    class=${this._computeApparmorClassName}
                    id="apparmor"
                    label="apparmor"
                    description=""
                  >
                    <ha-svg-icon path=${mdiShield}></ha-svg-icon>
                  </ha-label-badge>
                `
              : ""}
            ${this.addon.auth_api
              ? html`
                  <ha-label-badge
                    @click=${this._showMoreInfo}
                    id="auth_api"
                    label="auth"
                    description=""
                  >
                    <ha-svg-icon path=${mdiKey}></ha-svg-icon>
                  </ha-label-badge>
                `
              : ""}
            ${this.addon.ingress
              ? html`
                  <ha-label-badge
                    @click=${this._showMoreInfo}
                    id="ingress"
                    label="ingress"
                    description=""
                  >
                    <ha-svg-icon
                      path=${mdiCursorDefaultClickOutline}
                    ></ha-svg-icon>
                  </ha-label-badge>
                `
              : ""}
          </div>

          ${this.addon.version
            ? html`
                <div class="addon-options">
                  <ha-settings-row ?three-line=${this.narrow}>
                    <span slot="heading">
                      Start on boot
                    </span>
                    <span slot="description">
                      Make the add-on start during a system boot
                    </span>
                    <ha-switch
                      @change=${this._startOnBootToggled}
                      .checked=${this.addon.boot === "auto"}
                      haptic
                    ></ha-switch>
                  </ha-settings-row>

                  ${this.hass.userData?.showAdvanced
                    ? html`
                        <ha-settings-row ?three-line=${this.narrow}>
                          <span slot="heading">
                            Watchdog
                          </span>
                          <span slot="description">
                            This will start the add-on if it crashes
                          </span>
                          <ha-switch
                            @change=${this._watchdogToggled}
                            .checked=${this.addon.watchdog}
                            haptic
                          ></ha-switch>
                        </ha-settings-row>
                      `
                    : ""}
                  ${this.addon.auto_update || this.hass.userData?.showAdvanced
                    ? html`
                        <ha-settings-row ?three-line=${this.narrow}>
                          <span slot="heading">
                            Auto update
                          </span>
                          <span slot="description">
                            Auto update the add-on when there is a new version
                            available
                          </span>
                          <ha-switch
                            @change=${this._autoUpdateToggled}
                            .checked=${this.addon.auto_update}
                            haptic
                          ></ha-switch>
                        </ha-settings-row>
                      `
                    : ""}
                  ${this.addon.ingress
                    ? html`
                        <ha-settings-row ?three-line=${this.narrow}>
                          <span slot="heading">
                            Show in sidebar
                          </span>
                          <span slot="description">
                            ${this._computeCannotIngressSidebar
                              ? "This option requires Home Assistant 0.92 or later."
                              : "Add this add-on to your sidebar"}
                          </span>
                          <ha-switch
                            @change=${this._panelToggled}
                            .checked=${this.addon.ingress_panel}
                            .disabled=${this._computeCannotIngressSidebar}
                            haptic
                          ></ha-switch>
                        </ha-settings-row>
                      `
                    : ""}
                  ${this._computeUsesProtectedOptions
                    ? html`
                        <ha-settings-row ?three-line=${this.narrow}>
                          <span slot="heading">
                            Protection mode
                          </span>
                          <span slot="description">
                            Blocks elevated system access from the add-on
                          </span>
                          <ha-switch
                            @change=${this._protectionToggled}
                            .checked=${this.addon.protected}
                            haptic
                          ></ha-switch>
                        </ha-settings-row>
                      `
                    : ""}
                </div>
              `
            : ""}
          ${this._error ? html` <div class="errors">${this._error}</div> ` : ""}
        </div>
        <div class="card-actions">
          ${this.addon.version
            ? html`
                ${this._computeIsRunning
                  ? html`
                      <ha-call-api-button
                        class="warning"
                        .hass=${this.hass}
                        .path="hassio/addons/${this.addon.slug}/stop"
                      >
                        Stop
                      </ha-call-api-button>
                      <ha-call-api-button
                        class="warning"
                        .hass=${this.hass}
                        .path="hassio/addons/${this.addon.slug}/restart"
                      >
                        Restart
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
                        href=${this._pathWebui!}
                        tabindex="-1"
                        target="_blank"
                        class="right"
                        rel="noopener"
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
                <mwc-button
                  class=" right warning"
                  @click=${this._uninstallClicked}
                >
                  Uninstall
                </mwc-button>
                ${this.addon.build
                  ? html`
                      <ha-call-api-button
                        class="warning right"
                        .hass=${this.hass}
                        .path="hassio/addons/${this.addon.slug}/rebuild"
                      >
                        Rebuild
                      </ha-call-api-button>
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
                <ha-progress-button
                  .disabled=${!this.addon.available || this._installing}
                  .progress=${this._installing}
                  @click=${this._installClicked}
                >
                  Install
                </ha-progress-button>
              `}
        </div>
      </ha-card>

      ${this.addon.long_description
        ? html`
            <ha-card>
              <div class="card-content">
                <ha-markdown
                  .content=${this.addon.long_description}
                ></ha-markdown>
              </div>
            </ha-card>
          `
        : ""}
    `;
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
    const id = ev.currentTarget.id;
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
      this.addon.version !== this.addon.version_latest
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
    return (
      !this.addon.ingress || !atLeastVersion(this.hass.config.version, 0, 92)
    );
  }

  private get _computeUsesProtectedOptions(): boolean {
    return (
      this.addon.docker_api || this.addon.full_access || this.addon.host_pid
    );
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

  private async _watchdogToggled(): Promise<void> {
    this._error = undefined;
    const data: HassioAddonSetOptionParams = {
      watchdog: !this.addon.watchdog,
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
      this._error = `Failed to set addon security option, ${
        err.body?.message || err
      }`;
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
      this._error = `Failed to get addon changelog, ${
        err.body?.message || err
      }`;
    }
  }

  private async _installClicked(): Promise<void> {
    this._error = undefined;
    this._installing = true;
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
    this._installing = false;
  }

  private async _uninstallClicked(): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      title: this.addon.name,
      text: "Are you sure you want to uninstall this add-on?",
      confirmText: "uninstall add-on",
      dismissText: "no",
    });

    if (!confirmed) {
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

  static get styles(): CSSResult[] {
    return [
      haStyle,
      hassioStyle,
      css`
        :host {
          display: block;
        }
        ha-card {
          display: block;
          margin-bottom: 16px;
        }
        ha-card.warning {
          background-color: var(--error-color);
          color: white;
        }
        ha-card.warning .card-header {
          color: white;
        }
        ha-card.warning .card-content {
          color: white;
        }
        ha-card.warning mwc-button {
          --mdc-theme-primary: white !important;
        }
        .warning {
          color: var(--error-color);
          --mdc-theme-primary: var(--error-color);
        }
        .light-color {
          color: var(--secondary-text-color);
        }
        .addon-header {
          padding-left: 8px;
          font-size: 24px;
          color: var(--ha-card-header-color, --primary-text-color);
        }
        .addon-version {
          float: right;
          font-size: 15px;
          vertical-align: middle;
        }
        .errors {
          color: var(--error-color);
          margin-bottom: 16px;
        }
        .description {
          margin-bottom: 16px;
        }
        img.logo {
          max-height: 60px;
          margin: 16px 0;
          display: block;
        }

        ha-switch {
          display: flex;
        }
        ha-svg-icon.running {
          color: var(--paper-green-400);
        }
        ha-svg-icon.stopped {
          color: var(--google-red-300);
        }
        ha-call-api-button {
          font-weight: 500;
          color: var(--primary-color);
        }
        .right {
          float: right;
        }
        protection-enable mwc-button {
          --mdc-theme-primary: white;
        }
        .description a {
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
          --ha-label-badge-padding: 8px 0 0 0;
        }
        .changelog {
          display: contents;
        }
        .changelog-link {
          color: var(--primary-color);
          text-decoration: underline;
          cursor: pointer;
        }
        ha-markdown {
          padding: 16px;
        }
        ha-settings-row {
          padding: 0;
          height: 54px;
          width: 100%;
        }
        ha-settings-row > span[slot="description"] {
          white-space: normal;
          color: var(--secondary-text-color);
        }
        ha-settings-row[three-line] {
          height: 74px;
        }

        .addon-options {
          max-width: 50%;
        }
        @media (max-width: 720px) {
          .addon-options {
            max-width: 100%;
          }
        }
      `,
    ];
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "hassio-addon-info": HassioAddonInfo;
  }
}
