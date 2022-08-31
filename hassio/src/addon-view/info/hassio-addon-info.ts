import "@material/mwc-button";
import {
  mdiCheckCircle,
  mdiChip,
  mdiCircle,
  mdiCursorDefaultClickOutline,
  mdiDocker,
  mdiExclamationThick,
  mdiFlask,
  mdiHomeAssistant,
  mdiKey,
  mdiLinkLock,
  mdiNetwork,
  mdiNumeric1,
  mdiNumeric2,
  mdiNumeric3,
  mdiNumeric4,
  mdiNumeric5,
  mdiNumeric6,
  mdiNumeric7,
  mdiNumeric8,
  mdiPound,
  mdiShield,
} from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { atLeastVersion } from "../../../../src/common/config/version";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import { navigate } from "../../../../src/common/navigate";
import "../../../../src/components/buttons/ha-call-api-button";
import "../../../../src/components/buttons/ha-progress-button";
import "../../../../src/components/ha-alert";
import "../../../../src/components/ha-card";
import "../../../../src/components/ha-chip";
import "../../../../src/components/ha-chip-set";
import "../../../../src/components/ha-markdown";
import "../../../../src/components/ha-settings-row";
import "../../../../src/components/ha-svg-icon";
import "../../../../src/components/ha-switch";
import {
  AddonCapability,
  fetchHassioAddonChangelog,
  fetchHassioAddonInfo,
  HassioAddonDetails,
  HassioAddonSetOptionParams,
  HassioAddonSetSecurityParams,
  installHassioAddon,
  restartHassioAddon,
  setHassioAddonOption,
  setHassioAddonSecurity,
  startHassioAddon,
  stopHassioAddon,
  uninstallHassioAddon,
  validateHassioAddonOption,
} from "../../../../src/data/hassio/addon";
import {
  extractApiErrorMessage,
  fetchHassioStats,
  HassioStats,
} from "../../../../src/data/hassio/common";
import {
  StoreAddon,
  StoreAddonDetails,
} from "../../../../src/data/supervisor/store";
import { Supervisor } from "../../../../src/data/supervisor/supervisor";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../src/dialogs/generic/show-dialog-box";
import { haStyle } from "../../../../src/resources/styles";
import { HomeAssistant, Route } from "../../../../src/types";
import { bytesToString } from "../../../../src/util/bytes-to-string";
import "../../components/hassio-card-content";
import "../../components/supervisor-metric";
import { showHassioMarkdownDialog } from "../../dialogs/markdown/show-dialog-hassio-markdown";
import { hassioStyle } from "../../resources/hassio-style";
import "../../update-available/update-available-card";
import { addonArchIsSupported, extractChangelog } from "../../util/addon";

const STAGE_ICON = {
  stable: mdiCheckCircle,
  experimental: mdiFlask,
  deprecated: mdiExclamationThick,
};

const RATING_ICON = {
  1: mdiNumeric1,
  2: mdiNumeric2,
  3: mdiNumeric3,
  4: mdiNumeric4,
  5: mdiNumeric5,
  6: mdiNumeric6,
  7: mdiNumeric7,
  8: mdiNumeric8,
};

@customElement("hassio-addon-info")
class HassioAddonInfo extends LitElement {
  @property({ type: Boolean }) public narrow!: boolean;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public addon!:
    | HassioAddonDetails
    | StoreAddonDetails;

  @property({ attribute: false }) public supervisor!: Supervisor;

  @state() private _metrics?: HassioStats;

  @state() private _error?: string;

  private _addonStoreInfo = memoizeOne(
    (slug: string, storeAddons: StoreAddon[]) =>
      storeAddons.find((addon) => addon.slug === slug)
  );

  protected render(): TemplateResult {
    const addonStoreInfo =
      !this.addon.detached && !this.addon.available
        ? this._addonStoreInfo(this.addon.slug, this.supervisor.store.addons)
        : undefined;
    const metrics = [
      {
        description: this.supervisor.localize("addon.dashboard.cpu_usage"),
        value: this._metrics?.cpu_percent,
      },
      {
        description: this.supervisor.localize("addon.dashboard.ram_usage"),
        value: this._metrics?.memory_percent,
        tooltip: `${bytesToString(this._metrics?.memory_usage)}/${bytesToString(
          this._metrics?.memory_limit
        )}`,
      },
    ];
    return html`
      ${this.addon.update_available
        ? html`
            <update-available-card
              .hass=${this.hass}
              .narrow=${this.narrow}
              .supervisor=${this.supervisor}
              .addonSlug=${this.addon.slug}
              @update-complete=${this._updateComplete}
            ></update-available-card>
          `
        : ""}
      ${"protected" in this.addon && !this.addon.protected
        ? html`
            <ha-alert
              alert-type="error"
              .title=${this.supervisor.localize(
                "addon.dashboard.protection_mode.title"
              )}
            >
              ${this.supervisor.localize(
                "addon.dashboard.protection_mode.content"
              )}
              <mwc-button
                slot="action"
                .label=${this.supervisor.localize(
                  "addon.dashboard.protection_mode.enable"
                )}
                @click=${this._protectionToggled}
              >
              </mwc-button>
            </ha-alert>
          `
        : ""}

      <ha-card outlined>
        <div class="card-content">
          <div class="addon-header">
            ${!this.narrow ? this.addon.name : ""}
            <div class="addon-version light-color">
              ${this.addon.version
                ? html`
                    ${this._computeIsRunning
                      ? html`
                          <ha-svg-icon
                            .title=${this.supervisor.localize(
                              "dashboard.addon_running"
                            )}
                            class="running"
                            .path=${mdiCircle}
                          ></ha-svg-icon>
                        `
                      : html`
                          <ha-svg-icon
                            .title=${this.supervisor.localize(
                              "dashboard.addon_stopped"
                            )}
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
                    (<span class="changelog-link"
                      >${this.supervisor.localize(
                        "addon.dashboard.changelog"
                      )}</span
                    >)
                  </div>
                `
              : html`<span class="changelog-link" @click=${this._openChangelog}
                  >${this.supervisor.localize(
                    "addon.dashboard.changelog"
                  )}</span
                >`}
          </div>

          <ha-chip-set class="capabilities">
            ${this.addon.stage !== "stable"
              ? html` <ha-chip
                  hasIcon
                  class=${classMap({
                    yellow: this.addon.stage === "experimental",
                    red: this.addon.stage === "deprecated",
                  })}
                  @click=${this._showMoreInfo}
                  id="stage"
                >
                  <ha-svg-icon
                    slot="icon"
                    .path=${STAGE_ICON[this.addon.stage]}
                  >
                  </ha-svg-icon>
                  ${this.supervisor.localize(
                    `addon.dashboard.capability.stages.${this.addon.stage}`
                  )}
                </ha-chip>`
              : ""}

            <ha-chip
              hasIcon
              class=${classMap({
                green: Number(this.addon.rating) >= 6,
                yellow: [3, 4, 5].includes(Number(this.addon.rating)),
                red: Number(this.addon.rating) >= 2,
              })}
              @click=${this._showMoreInfo}
              id="rating"
            >
              <ha-svg-icon slot="icon" .path=${RATING_ICON[this.addon.rating]}>
              </ha-svg-icon>

              ${this.supervisor.localize(
                "addon.dashboard.capability.label.rating"
              )}
            </ha-chip>
            ${this.addon.host_network
              ? html`
                  <ha-chip
                    hasIcon
                    @click=${this._showMoreInfo}
                    id="host_network"
                  >
                    <ha-svg-icon slot="icon" .path=${mdiNetwork}> </ha-svg-icon>
                    ${this.supervisor.localize(
                      "addon.dashboard.capability.label.host"
                    )}
                  </ha-chip>
                `
              : ""}
            ${this.addon.full_access
              ? html`
                  <ha-chip
                    hasIcon
                    @click=${this._showMoreInfo}
                    id="full_access"
                  >
                    <ha-svg-icon slot="icon" .path=${mdiChip}></ha-svg-icon>
                    ${this.supervisor.localize(
                      "addon.dashboard.capability.label.hardware"
                    )}
                  </ha-chip>
                `
              : ""}
            ${this.addon.homeassistant_api
              ? html`
                  <ha-chip
                    hasIcon
                    @click=${this._showMoreInfo}
                    id="homeassistant_api"
                  >
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiHomeAssistant}
                    ></ha-svg-icon>
                    ${this.supervisor.localize(
                      "addon.dashboard.capability.label.core"
                    )}
                  </ha-chip>
                `
              : ""}
            ${this._computeHassioApi
              ? html`
                  <ha-chip hasIcon @click=${this._showMoreInfo} id="hassio_api">
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiHomeAssistant}
                    ></ha-svg-icon>
                    ${this.supervisor.localize(
                      `addon.dashboard.capability.role.${this.addon.hassio_role}`
                    ) || this.addon.hassio_role}
                  </ha-chip>
                `
              : ""}
            ${this.addon.docker_api
              ? html`
                  <ha-chip hasIcon @click=${this._showMoreInfo} id="docker_api">
                    <ha-svg-icon slot="icon" .path=${mdiDocker}></ha-svg-icon>
                    ${this.supervisor.localize(
                      "addon.dashboard.capability.label.docker"
                    )}
                  </ha-chip>
                `
              : ""}
            ${this.addon.host_pid
              ? html`
                  <ha-chip hasIcon @click=${this._showMoreInfo} id="host_pid">
                    <ha-svg-icon slot="icon" .path=${mdiPound}></ha-svg-icon>
                    ${this.supervisor.localize(
                      "addon.dashboard.capability.label.host_pid"
                    )}
                  </ha-chip>
                `
              : ""}
            ${this.addon.apparmor !== "default"
              ? html`
                  <ha-chip
                    hasIcon
                    @click=${this._showMoreInfo}
                    class=${this._computeApparmorClassName}
                    id="apparmor"
                  >
                    <ha-svg-icon slot="icon" .path=${mdiShield}></ha-svg-icon>
                    ${this.supervisor.localize(
                      "addon.dashboard.capability.label.apparmor"
                    )}
                  </ha-chip>
                `
              : ""}
            ${this.addon.auth_api
              ? html`
                  <ha-chip hasIcon @click=${this._showMoreInfo} id="auth_api">
                    <ha-svg-icon slot="icon" .path=${mdiKey}></ha-svg-icon>
                    ${this.supervisor.localize(
                      "addon.dashboard.capability.label.auth"
                    )}
                  </ha-chip>
                `
              : ""}
            ${this.addon.ingress
              ? html`
                  <ha-chip hasIcon @click=${this._showMoreInfo} id="ingress">
                    <ha-svg-icon
                      slot="icon"
                      .path=${mdiCursorDefaultClickOutline}
                    ></ha-svg-icon>
                    ${this.supervisor.localize(
                      "addon.dashboard.capability.label.ingress"
                    )}
                  </ha-chip>
                `
              : ""}
            ${this.addon.signed
              ? html`
                  <ha-chip hasIcon @click=${this._showMoreInfo} id="signed">
                    <ha-svg-icon slot="icon" .path=${mdiLinkLock}></ha-svg-icon>
                    ${this.supervisor.localize(
                      "addon.dashboard.capability.label.signed"
                    )}
                  </ha-chip>
                `
              : ""}
          </ha-chip-set>

          <div class="description light-color">
            ${this.addon.description}.<br />
            ${this.supervisor.localize(
              "addon.dashboard.visit_addon_page",
              "name",
              html`<a href=${this.addon.url!} target="_blank" rel="noreferrer"
                >${this.addon.name}</a
              >`
            )}
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
              ${this.addon.version
                ? html`
                    <div
                      class=${classMap({
                        "addon-options": true,
                        started: this.addon.state === "started",
                      })}
                    >
                      <ha-settings-row ?three-line=${this.narrow}>
                        <span slot="heading">
                          ${this.supervisor.localize(
                            "addon.dashboard.option.boot.title"
                          )}
                        </span>
                        <span slot="description">
                          ${this.supervisor.localize(
                            "addon.dashboard.option.boot.description"
                          )}
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
                                ${this.supervisor.localize(
                                  "addon.dashboard.option.watchdog.title"
                                )}
                              </span>
                              <span slot="description">
                                ${this.supervisor.localize(
                                  "addon.dashboard.option.watchdog.description"
                                )}
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
                                ${this.supervisor.localize(
                                  "addon.dashboard.option.auto_update.title"
                                )}
                              </span>
                              <span slot="description">
                                ${this.supervisor.localize(
                                  "addon.dashboard.option.auto_update.description"
                                )}
                              </span>
                              <ha-switch
                                @change=${this._autoUpdateToggled}
                                .checked=${this.addon.auto_update}
                                haptic
                              ></ha-switch>
                            </ha-settings-row>
                          `
                        : ""}
                      ${!this._computeCannotIngressSidebar && this.addon.ingress
                        ? html`
                            <ha-settings-row ?three-line=${this.narrow}>
                              <span slot="heading">
                                ${this.supervisor.localize(
                                  "addon.dashboard.option.ingress_panel.title"
                                )}
                              </span>
                              <span slot="description">
                                ${this.supervisor.localize(
                                  "addon.dashboard.option.ingress_panel.description"
                                )}
                              </span>
                              <ha-switch
                                @change=${this._panelToggled}
                                .checked=${this.addon.ingress_panel}
                                haptic
                              ></ha-switch>
                            </ha-settings-row>
                          `
                        : ""}
                      ${this._computeUsesProtectedOptions
                        ? html`
                            <ha-settings-row ?three-line=${this.narrow}>
                              <span slot="heading">
                                ${this.supervisor.localize(
                                  "addon.dashboard.option.protected.title"
                                )}
                              </span>
                              <span slot="description">
                                ${this.supervisor.localize(
                                  "addon.dashboard.option.protected.description"
                                )}
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
              ${this.addon.version && this.addon.state === "started"
                ? html`<ha-settings-row ?three-line=${this.narrow}>
                      <span slot="heading">
                        ${this.supervisor.localize("addon.dashboard.hostname")}
                      </span>
                      <code slot="description"> ${this.addon.hostname} </code>
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
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : ""}
          ${!this.addon.version && addonStoreInfo && !this.addon.available
            ? !addonArchIsSupported(
                this.supervisor.info.supported_arch,
                this.addon.arch
              )
              ? html`
                  <ha-alert alert-type="warning">
                    ${this.supervisor.localize(
                      "addon.dashboard.not_available_arch"
                    )}
                  </ha-alert>
                `
              : html`
                  <ha-alert alert-type="warning">
                    ${this.supervisor.localize(
                      "addon.dashboard.not_available_version",
                      "core_version_installed",
                      this.supervisor.core.version,
                      "core_version_needed",
                      addonStoreInfo!.homeassistant
                    )}
                  </ha-alert>
                `
            : ""}
        </div>
        <div class="card-actions">
          <div>
            ${this.addon.version
              ? this._computeIsRunning
                ? html`
                    <ha-progress-button
                      class="warning"
                      @click=${this._stopClicked}
                    >
                      ${this.supervisor.localize("addon.dashboard.stop")}
                    </ha-progress-button>
                    <ha-progress-button
                      class="warning"
                      @click=${this._restartClicked}
                    >
                      ${this.supervisor.localize("addon.dashboard.restart")}
                    </ha-progress-button>
                  `
                : html`
                    <ha-progress-button @click=${this._startClicked}>
                      ${this.supervisor.localize("addon.dashboard.start")}
                    </ha-progress-button>
                  `
              : html`
                  <ha-progress-button
                    .disabled=${!this.addon.available}
                    @click=${this._installClicked}
                  >
                    ${this.supervisor.localize("addon.dashboard.install")}
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
                            ${this.supervisor.localize(
                              "addon.dashboard.open_web_ui"
                            )}
                          </mwc-button>
                        </a>
                      `
                    : ""}
                  ${this._computeShowIngressUI
                    ? html`
                        <mwc-button @click=${this._openIngress}>
                          ${this.supervisor.localize(
                            "addon.dashboard.open_web_ui"
                          )}
                        </mwc-button>
                      `
                    : ""}
                  <ha-progress-button
                    class="warning"
                    @click=${this._uninstallClicked}
                  >
                    ${this.supervisor.localize("addon.dashboard.uninstall")}
                  </ha-progress-button>
                  ${this.addon.build
                    ? html`
                        <ha-call-api-button
                          class="warning"
                          .hass=${this.hass}
                          .path="hassio/addons/${this.addon.slug}/rebuild"
                        >
                          ${this.supervisor.localize("addon.dashboard.rebuild")}
                        </ha-call-api-button>
                      `
                    : ""}`
              : ""}
          </div>
        </div>
      </ha-card>

      ${this.addon.long_description
        ? html`
            <ha-card outlined>
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
    if ("state" in this.addon && this.addon.state === "started") {
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
    const id = ev.currentTarget.id as AddonCapability;
    showHassioMarkdownDialog(this, {
      title: this.supervisor.localize(`addon.dashboard.capability.${id}.title`),
      content:
        id === "stage"
          ? this.supervisor.localize(
              `addon.dashboard.capability.${id}.description`,
              "icon_stable",
              `<ha-svg-icon path="${STAGE_ICON.stable}"></ha-svg-icon>`,
              "icon_experimental",
              `<ha-svg-icon path="${STAGE_ICON.experimental}"></ha-svg-icon>`,
              "icon_deprecated",
              `<ha-svg-icon path="${STAGE_ICON.deprecated}"></ha-svg-icon>`
            )
          : this.supervisor.localize(
              `addon.dashboard.capability.${id}.description`
            ),
    });
  }

  private get _computeIsRunning(): boolean {
    return (this.addon as HassioAddonDetails)?.state === "started";
  }

  private get _pathWebui(): string | null {
    return (this.addon as HassioAddonDetails).webui!.replace(
      "[HOST]",
      document.location.hostname
    );
  }

  private get _computeShowWebUI(): boolean | "" | null {
    return (
      !this.addon.ingress &&
      (this.addon as HassioAddonDetails).webui &&
      this._computeIsRunning
    );
  }

  private _openIngress(): void {
    navigate(`/hassio/ingress/${this.addon.slug}`);
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
      boot:
        (this.addon as HassioAddonDetails).boot === "auto" ? "manual" : "auto",
    };
    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err: any) {
      this._error = this.supervisor.localize(
        "addon.failed_to_save",
        "error",
        extractApiErrorMessage(err)
      );
    }
  }

  private async _watchdogToggled(): Promise<void> {
    this._error = undefined;
    const data: HassioAddonSetOptionParams = {
      watchdog: !(this.addon as HassioAddonDetails).watchdog,
    };
    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err: any) {
      this._error = this.supervisor.localize(
        "addon.failed_to_save",
        "error",
        extractApiErrorMessage(err)
      );
    }
  }

  private async _autoUpdateToggled(): Promise<void> {
    this._error = undefined;
    const data: HassioAddonSetOptionParams = {
      auto_update: !(this.addon as HassioAddonDetails).auto_update,
    };
    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err: any) {
      this._error = this.supervisor.localize(
        "addon.failed_to_save",
        "error",
        extractApiErrorMessage(err)
      );
    }
  }

  private async _protectionToggled(): Promise<void> {
    this._error = undefined;
    const data: HassioAddonSetSecurityParams = {
      protected: !(this.addon as HassioAddonDetails).protected,
    };
    try {
      await setHassioAddonSecurity(this.hass, this.addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "security",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err: any) {
      this._error = this.supervisor.localize(
        "addon.failed_to_save",
        "error",
        extractApiErrorMessage(err)
      );
    }
  }

  private async _panelToggled(): Promise<void> {
    this._error = undefined;
    const data: HassioAddonSetOptionParams = {
      ingress_panel: !(this.addon as HassioAddonDetails).ingress_panel,
    };
    try {
      await setHassioAddonOption(this.hass, this.addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err: any) {
      this._error = this.supervisor.localize(
        "addon.failed_to_save",
        "error",
        extractApiErrorMessage(err)
      );
    }
  }

  private async _openChangelog(): Promise<void> {
    try {
      const content = await fetchHassioAddonChangelog(
        this.hass,
        this.addon.slug
      );

      showHassioMarkdownDialog(this, {
        title: this.supervisor.localize("addon.dashboard.changelog"),
        content: extractChangelog(this.addon as HassioAddonDetails, content),
      });
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.supervisor.localize(
          "addon.dashboard.action_error.get_changelog"
        ),
        text: extractApiErrorMessage(err),
      });
    }
  }

  private _updateComplete() {
    const eventdata = {
      success: true,
      response: undefined,
      path: "install",
    };
    fireEvent(this, "hass-api-called", eventdata);
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
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.supervisor.localize("addon.dashboard.action_error.install"),
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
  }

  private async _stopClicked(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    try {
      await stopHassioAddon(this.hass, this.addon.slug);
      const eventdata = {
        success: true,
        response: undefined,
        path: "stop",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.supervisor.localize("addon.dashboard.action_error.stop"),
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
  }

  private async _restartClicked(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    try {
      await restartHassioAddon(this.hass, this.addon.slug);
      const eventdata = {
        success: true,
        response: undefined,
        path: "stop",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.supervisor.localize("addon.dashboard.action_error.restart"),
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
      if (!validate.valid) {
        await showConfirmationDialog(this, {
          title: this.supervisor.localize(
            "addon.dashboard.action_error.start_invalid_config"
          ),
          text: validate.message.split(" Got ")[0],
          confirm: () => this._openConfiguration(),
          confirmText: this.supervisor.localize(
            "addon.dashboard.action_error.go_to_config"
          ),
          dismissText: this.supervisor.localize("common.cancel"),
        });
        button.progress = false;
        return;
      }
    } catch (err: any) {
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
      const eventdata = {
        success: true,
        response: undefined,
        path: "start",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.supervisor.localize("addon.dashboard.action_error.start"),
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
  }

  private _openConfiguration(): void {
    navigate(`/hassio/addon/${this.addon.slug}/config`);
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
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.supervisor.localize(
          "addon.dashboard.action_error.uninstall"
        ),
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
  }

  static get styles(): CSSResultGroup {
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
          max-width: 100%;
          max-height: 60px;
          margin: 16px 0;
          display: block;
        }

        ha-switch {
          display: flex;
        }
        ha-svg-icon.running {
          color: var(--success-color);
        }
        ha-svg-icon.stopped {
          color: var(--error-color);
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
        ha-chip {
          text-transform: capitalize;
          --ha-chip-text-color: var(--text-primary-color);
          --ha-chip-background-color: var(--primary-color);
        }

        .red {
          --ha-chip-background-color: var(--label-badge-red, #df4c1e);
        }
        .blue {
          --ha-chip-background-color: var(--label-badge-blue, #039be5);
        }
        .green {
          --ha-chip-background-color: var(--label-badge-green, #0da035);
        }
        .yellow {
          --ha-chip-background-color: var(--label-badge-yellow, #f4b400);
        }
        .capabilities {
          margin-bottom: 16px;
        }
        .card-actions {
          justify-content: space-between;
          display: flex;
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

        ha-alert mwc-button {
          --mdc-theme-primary: var(--primary-text-color);
        }
        a {
          text-decoration: none;
        }

        update-available-card {
          padding-bottom: 16px;
        }

        @media (max-width: 720px) {
          ha-chip {
            line-height: 36px;
          }
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
