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
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
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
import "../../../../src/components/ha-settings-row";
import "../../../../src/components/ha-svg-icon";
import "../../../../src/components/ha-switch";
import {
  fetchHassioAddonChangelog,
  fetchHassioAddonInfo,
  HassioAddonDetails,
  HassioAddonSetOptionParams,
  HassioAddonSetSecurityParams,
  installHassioAddon,
  setHassioAddonOption,
  setHassioAddonSecurity,
  startHassioAddon,
  uninstallHassioAddon,
  validateHassioAddonOption,
} from "../../../../src/data/hassio/addon";
import {
  extractApiErrorMessage,
  fetchHassioStats,
  HassioStats,
} from "../../../../src/data/hassio/common";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../src/dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { bytesToString } from "../../../../src/util/bytes-to-string";
import "../../components/hassio-card-content";
import "../../components/supervisor-metric";
import { showHassioMarkdownDialog } from "../../dialogs/markdown/show-dialog-hassio-markdown";
import { hassioStyle } from "../../resources/hassio-style";
import { addonArchIsSupported } from "../../util/addon";

const STAGE_ICON = {
  stable: mdiCheckCircle,
  experimental: mdiFlask,
  deprecated: mdiExclamationThick,
};

const PERMIS_DESC = {
  stage: {
    title: "Add-on Stage",
    description: `Add-ons can have one of three stages:\n\n<ha-svg-icon path="${STAGE_ICON.stable}"></ha-svg-icon> **Stable**: These are add-ons ready to be used in production.\n\n<ha-svg-icon path="${STAGE_ICON.experimental}"></ha-svg-icon> **Experimental**: These may contain bugs, and may be unfinished.\n\n<ha-svg-icon path="${STAGE_ICON.deprecated}"></ha-svg-icon> **Deprecated**: These add-ons will no longer receive any updates.`,
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

  @property({ attribute: false }) public supervisor!: Supervisor;

  @internalProperty() private _metrics?: HassioStats;

  @internalProperty() private _error?: string;

  protected render(): TemplateResult {
    const metrics = [
      {
        description: "Add-on CPU Usage",
        value: this._metrics?.cpu_percent,
      },
      {
        description: "Add-on RAM Usage",
        value: this._metrics?.memory_percent,
        tooltip: `${bytesToString(this._metrics?.memory_usage)}/${bytesToString(
          this._metrics?.memory_limit
        )}`,
      },
    ];
    return html`
      ${this.addon.update_available
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
                  ? !addonArchIsSupported(
                      this.supervisor.info.supported_arch,
                      this.addon.arch
                    )
                    ? html`
                        <p>
                          This add-on is not compatible with the processor of
                          your device or the operating system you have installed
                          on your device.
                        </p>
                      `
                    : html`
                        <p>
                          You are running Home Assistant
                          ${this.supervisor.core.version}, to update to this
                          version of the add-on you need at least version
                          ${this.addon.homeassistant} of Home Assistant
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
          <h1 class="card-header">Warning: Protection mode is disabled!</h1>
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
                            .path=${mdiCircle}
                          ></ha-svg-icon>
                        `
                      : html`
                          <ha-svg-icon
                            title="Add-on is stopped"
                            class="stopped"
                            .path=${mdiCircle}
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
          <div class="addon-container">
            <div>
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
                        <ha-svg-icon .path=${mdiNetwork}></ha-svg-icon>
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
                        <ha-svg-icon .path=${mdiChip}></ha-svg-icon>
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
                        <ha-svg-icon .path=${mdiHomeAssistant}></ha-svg-icon>
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
                        <ha-svg-icon .path=${mdiHomeAssistant}></ha-svg-icon>
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
                        <ha-svg-icon .path=${mdiDocker}></ha-svg-icon>
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
                        <ha-svg-icon .path=${mdiPound}></ha-svg-icon>
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
                        <ha-svg-icon .path=${mdiShield}></ha-svg-icon>
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
                        <ha-svg-icon .path=${mdiKey}></ha-svg-icon>
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
                          .path=${mdiCursorDefaultClickOutline}
                        ></ha-svg-icon>
                      </ha-label-badge>
                    `
                  : ""}
              </div>

              ${this.addon.version
                ? html`
                    <div
                      class="${classMap({
                        "addon-options": true,
                        started: this.addon.state === "started",
                      })}"
                    >
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

                      ${this.addon.startup !== "once"
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
                      ${this.addon.auto_update ||
                      this.hass.userData?.showAdvanced
                        ? html`
                            <ha-settings-row ?three-line=${this.narrow}>
                              <span slot="heading">
                                Auto update
                              </span>
                              <span slot="description">
                                Auto update the add-on when there is a new
                                version available
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
            </div>
            <div>
              ${this.addon.state === "started"
                ? html`<ha-settings-row ?three-line=${this.narrow}>
                      <span slot="heading">
                        Hostname
                      </span>
                      <code slot="description">
                        ${this.addon.hostname}
                      </code>
                    </ha-settings-row>
                    ${metrics.map(
                      (metric) =>
                        html`
                          <supervisor-metric
                            .description=${metric.description}
                            .value=${metric.value ?? 0}
                            .tooltip=${metric.tooltip}
                          ></supervisor-metric>
                        `
                    )}`
                : ""}
            </div>
          </div>
          ${this._error ? html` <div class="errors">${this._error}</div> ` : ""}
          ${!this.addon.available
            ? !addonArchIsSupported(
                this.supervisor.info.supported_arch,
                this.addon.arch
              )
              ? html`
                  <p class="warning">
                    This add-on is not compatible with the processor of your
                    device or the operating system you have installed on your
                    device.
                  </p>
                `
              : html`
                  <p class="warning">
                    You are running Home Assistant
                    ${this.supervisor.core.version}, to install this add-on you
                    need at least version ${this.addon.homeassistant} of Home
                    Assistant
                  </p>
                `
            : ""}
        </div>
        <div class="card-actions">
          <div>
            ${this.addon.version
              ? this._computeIsRunning
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
                    <ha-progress-button @click=${this._startClicked}>
                      Start
                    </ha-progress-button>
                  `
              : html`
                  <ha-progress-button
                    .disabled=${!this.addon.available}
                    @click=${this._installClicked}
                  >
                    Install
                  </ha-progress-button>
                `}
          </div>
          <div>
            ${this.addon.version
              ? html` ${this._computeShowWebUI
                    ? html`
                        <a
                          href=${this._pathWebui!}
                          tabindex="-1"
                          target="_blank"
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
                        <mwc-button @click=${this._openIngress}>
                          Open web UI
                        </mwc-button>
                      `
                    : ""}
                  <ha-progress-button
                    class="warning"
                    @click=${this._uninstallClicked}
                  >
                    Uninstall
                  </ha-progress-button>
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
                    : ""}`
              : ""}
          </div>
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

  protected updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("addon")) {
      this._loadData();
    }
  }

  private async _loadData(): Promise<void> {
    if (this.addon.state === "started") {
      this._metrics = await fetchHassioStats(
        this.hass,
        `addons/${this.addon.slug}`
      );
    }
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
      this._error = `Failed to set addon option, ${extractApiErrorMessage(
        err
      )}`;
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
      this._error = `Failed to set addon option, ${extractApiErrorMessage(
        err
      )}`;
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
      this._error = `Failed to set addon option, ${extractApiErrorMessage(
        err
      )}`;
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
      this._error = `Failed to set addon security option, ${extractApiErrorMessage(
        err
      )}`;
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
      this._error = `Failed to set addon option, ${extractApiErrorMessage(
        err
      )}`;
    }
  }

  private async _openChangelog(): Promise<void> {
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
      showAlertDialog(this, {
        title: "Failed to get addon changelog",
        text: extractApiErrorMessage(err),
      });
    }
  }

  private async _installClicked(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    try {
      await installHassioAddon(this.hass, this.addon.slug);
      const eventdata = {
        success: true,
        response: undefined,
        path: "install",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to install addon",
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
  }

  private async _startClicked(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;
    try {
      const validate = await validateHassioAddonOption(
        this.hass,
        this.addon.slug
      );
      if (!validate.data.valid) {
        await showConfirmationDialog(this, {
          title: "Failed to start addon - configuration validation failed!",
          text: validate.data.message.split(" Got ")[0],
          confirm: () => this._openConfiguration(),
          confirmText: "Go to configuration",
          dismissText: "Cancel",
        });
        button.progress = false;
        return;
      }
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to validate addon configuration",
        text: extractApiErrorMessage(err),
      });
      button.progress = false;
      return;
    }

    try {
      await startHassioAddon(this.hass, this.addon.slug);
      this.addon = await fetchHassioAddonInfo(this.hass, this.addon.slug);
    } catch (err) {
      showAlertDialog(this, {
        title: "Failed to start addon",
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
  }

  private _openConfiguration(): void {
    navigate(this, `/hassio/addon/${this.addon.slug}/config`);
  }

  private async _uninstallClicked(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    const confirmed = await showConfirmationDialog(this, {
      title: this.addon.name,
      text: "Are you sure you want to uninstall this add-on?",
      confirmText: "uninstall add-on",
      dismissText: "no",
    });

    if (!confirmed) {
      button.progress = false;
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
      showAlertDialog(this, {
        title: "Failed to uninstall addon",
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
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
          justify-content: space-between;
          display: flex;
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
          max-width: 90%;
        }

        .addon-container {
          display: grid;
          grid-auto-flow: column;
          grid-template-columns: 60% 40%;
        }

        .addon-container > div:last-of-type {
          align-self: end;
        }

        @media (max-width: 720px) {
          .addon-options {
            max-width: 100%;
          }
          .addon-container {
            display: block;
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
