import "@home-assistant/webawesome/dist/components/divider/divider";
import { consume, type ContextType } from "@lit/context";
import {
  mdiApplicationImport,
  mdiArrowUpBoldCircleOutline,
  mdiCheckCircle,
  mdiChip,
  mdiCursorDefaultClickOutline,
  mdiDocker,
  mdiDotsVertical,
  mdiExclamationThick,
  mdiFlask,
  mdiHammer,
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
  mdiPackageVariantRemove,
  mdiPlay,
  mdiPound,
  mdiRestart,
  mdiShield,
  mdiStop,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { consumeEntityState } from "../../../../../common/decorators/consume-context-entry";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeDomain } from "../../../../../common/entity/compute_domain";
import { navigate } from "../../../../../common/navigate";
import { capitalizeFirstLetter } from "../../../../../common/string/capitalize-first-letter";
import type { LocalizeKeys } from "../../../../../common/translations/localize";
import "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/chips/ha-assist-chip";
import "../../../../../components/chips/ha-chip-set";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-dropdown";
import "../../../../../components/ha-dropdown-item";
import "../../../../../components/ha-formfield";
import "../../../../../components/ha-markdown";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/ha-switch";
import type { HaSwitch } from "../../../../../components/ha-switch";
import "../../../../../components/item/ha-row-item";
import {
  apiContext,
  internationalizationContext,
  registriesContext,
} from "../../../../../data/context";
import type {
  AddonCapability,
  HassioAddonDetails,
  HassioAddonSetOptionParams,
  HassioAddonSetSecurityParams,
} from "../../../../../data/hassio/addon";
import {
  fetchHassioAddonChangelog,
  fetchHassioAddonInfo,
  installHassioAddon,
  rebuildLocalAddon,
  restartHassioAddon,
  setHassioAddonOption,
  setHassioAddonSecurity,
  startHassioAddon,
  stopHassioAddon,
  uninstallHassioAddon,
  validateHassioAddonOption,
} from "../../../../../data/hassio/addon";
import type { HassioStats } from "../../../../../data/hassio/common";
import {
  extractApiErrorMessage,
  fetchHassioStats,
} from "../../../../../data/hassio/common";
import type { StoreAddonDetails } from "../../../../../data/supervisor/store";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import { showMoreInfoDialog } from "../../../../../dialogs/more-info/show-ha-more-info-dialog";
import { MobileAwareMixin } from "../../../../../mixins/mobile-aware-mixin";
import { mdiHomeAssistant } from "../../../../../resources/home-assistant-logo-svg";
import { haStyle } from "../../../../../resources/styles";
import type { Route } from "../../../../../types";
import { bytesToString } from "../../../../../util/bytes-to-string";
import { getAppDisplayName } from "../../common/app";
import "../../components/supervisor-apps-state";
import "../../components/supervisor-apps-tag";
import "../components/supervisor-app-metric";
import { extractChangelog } from "../util/supervisor-app";
import "./supervisor-app-system-managed";

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

const POLL_INTERVAL_SECONDS = 5;

@customElement("supervisor-app-info")
class SupervisorAppInfo extends MobileAwareMixin(LitElement) {
  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public route!: Route;

  @property({ attribute: false }) public addon!:
    | HassioAddonDetails
    | StoreAddonDetails;

  @property({ type: Boolean, attribute: "control-enabled" })
  public controlEnabled = false;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: registriesContext, subscribe: true })
  private registries!: ContextType<typeof registriesContext>;

  @consume({ context: apiContext, subscribe: true })
  private api!: ContextType<typeof apiContext>;

  @state() private _metrics?: HassioStats;

  @state() private _error?: string;

  @state() private _addon?: HassioAddonDetails | StoreAddonDetails;

  @state() private _updateEntityId?: string;

  @state() private _uninstalling = false;

  @state()
  @consumeEntityState({
    entityIdPath: ["_updateEntityId"],
  })
  private _updateState?: HassEntity;

  private _pollInterval?: number;

  protected mobileSizeQuery =
    "all and (max-width: 1120px), all and (max-height: 500px)";

  private get _currentAddon(): HassioAddonDetails | StoreAddonDetails {
    return this._addon || this.addon;
  }

  public connectedCallback() {
    super.connectedCallback();
    this._computeUpdateEntityId();
    this._startPolling();
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    this._stopPolling();
  }

  private _renderInfoCard() {
    const systemManaged = this._isSystemManaged(this._currentAddon);

    return html` <ha-card outlined>
      <div class="card-content">
        <div class="addon-header">
          <div class="title">
            ${this._currentAddon.logo
              ? html`
                  <img
                    class="logo"
                    alt=""
                    src="/api/hassio/addons/${this._currentAddon.slug}/logo"
                  />
                `
              : nothing}
            ${getAppDisplayName(
              this._currentAddon.name,
              this._currentAddon.stage
            )}
            <div class="description">
              ${this._currentAddon.version
                ? html`
                    ${this.i18n.localize(
                      "ui.panel.config.apps.dashboard.current_version",
                      { version: this._currentAddon.version }
                    )}
                    <div class="changelog" @click=${this._openChangelog}>
                      (<span class="changelog-link"
                        >${this.i18n.localize(
                          "ui.panel.config.apps.dashboard.changelog"
                        )}</span
                      >)
                    </div>
                  `
                : html`${this._currentAddon.version_latest}
                    <span class="changelog-link" @click=${this._openChangelog}
                      >${this.i18n.localize(
                        "ui.panel.config.apps.dashboard.changelog"
                      )}</span
                    >`}
            </div>
          </div>
          ${this._currentAddon.update_available ||
          this._updateState?.attributes?.in_progress
            ? html`<supervisor-apps-tag
                variant="brand"
                .iconPath=${mdiArrowUpBoldCircleOutline}
                .label=${this.i18n.localize(
                  `ui.panel.config.apps.state.${this._updateState?.attributes?.in_progress ? "updating" : "update_available"}`
                )}
              ></supervisor-apps-tag>`
            : nothing}
          ${this._currentAddon.version
            ? html`<supervisor-apps-state
                .state=${this._currentAddon.state}
              ></supervisor-apps-state>`
            : nothing}
        </div>

        <ha-chip-set class="capabilities">
          ${this._currentAddon.stage !== "stable"
            ? html`
                <ha-assist-chip
                  filled
                  class=${classMap({
                    yellow: this._currentAddon.stage === "experimental",
                    red: this._currentAddon.stage === "deprecated",
                  })}
                  @click=${this._showMoreInfo}
                  id="stage"
                  .label=${capitalizeFirstLetter(
                    this.i18n.localize(
                      `ui.panel.config.apps.dashboard.capability.stages.${this._currentAddon.stage}`
                    )
                  )}
                >
                  <ha-svg-icon
                    slot="icon"
                    .path=${STAGE_ICON[this._currentAddon.stage]}
                  >
                  </ha-svg-icon>
                </ha-assist-chip>
              `
            : nothing}

          <ha-assist-chip
            filled
            class=${classMap({
              green: Number(this._currentAddon.rating) >= 6,
              yellow: [3, 4, 5].includes(Number(this._currentAddon.rating)),
              red: Number(this._currentAddon.rating) <= 2,
            })}
            @click=${this._showMoreInfo}
            id="rating"
            .label=${capitalizeFirstLetter(
              this.i18n.localize(
                "ui.panel.config.apps.dashboard.capability.label.rating"
              )
            )}
          >
            <ha-svg-icon
              slot="icon"
              .path=${RATING_ICON[this._currentAddon.rating]}
            >
            </ha-svg-icon>
          </ha-assist-chip>
          ${this._currentAddon.host_network
            ? html`
                <ha-assist-chip
                  filled
                  @click=${this._showMoreInfo}
                  id="host_network"
                  .label=${capitalizeFirstLetter(
                    this.i18n.localize(
                      "ui.panel.config.apps.dashboard.capability.label.host"
                    )
                  )}
                >
                  <ha-svg-icon slot="icon" .path=${mdiNetwork}> </ha-svg-icon>
                </ha-assist-chip>
              `
            : nothing}
          ${this._currentAddon.full_access
            ? html`
                <ha-assist-chip
                  filled
                  @click=${this._showMoreInfo}
                  id="full_access"
                  .label=${capitalizeFirstLetter(
                    this.i18n.localize(
                      "ui.panel.config.apps.dashboard.capability.label.hardware"
                    )
                  )}
                >
                  <ha-svg-icon slot="icon" .path=${mdiChip}></ha-svg-icon>
                </ha-assist-chip>
              `
            : nothing}
          ${this._currentAddon.homeassistant_api
            ? html`
                <ha-assist-chip
                  filled
                  @click=${this._showMoreInfo}
                  id="homeassistant_api"
                  .label=${capitalizeFirstLetter(
                    this.i18n.localize(
                      "ui.panel.config.apps.dashboard.capability.label.core"
                    )
                  )}
                >
                  <ha-svg-icon
                    slot="icon"
                    .path=${mdiHomeAssistant}
                  ></ha-svg-icon>
                </ha-assist-chip>
              `
            : nothing}
          ${this._computeHassioApi
            ? html`
                <ha-assist-chip
                  filled
                  @click=${this._showMoreInfo}
                  id="hassio_api"
                  .label=${capitalizeFirstLetter(
                    this.i18n.localize(
                      `ui.panel.config.apps.dashboard.capability.role.${this._currentAddon.hassio_role}`
                    ) || this._currentAddon.hassio_role
                  )}
                >
                  <ha-svg-icon
                    slot="icon"
                    .path=${mdiHomeAssistant}
                  ></ha-svg-icon>
                </ha-assist-chip>
              `
            : nothing}
          ${this._currentAddon.docker_api
            ? html`
                <ha-assist-chip
                  filled
                  @click=${this._showMoreInfo}
                  id="docker_api"
                  .label=${capitalizeFirstLetter(
                    this.i18n.localize(
                      "ui.panel.config.apps.dashboard.capability.label.docker"
                    )
                  )}
                >
                  <ha-svg-icon slot="icon" .path=${mdiDocker}></ha-svg-icon>
                </ha-assist-chip>
              `
            : nothing}
          ${this._currentAddon.host_pid
            ? html`
                <ha-assist-chip
                  filled
                  @click=${this._showMoreInfo}
                  id="host_pid"
                  .label=${capitalizeFirstLetter(
                    this.i18n.localize(
                      "ui.panel.config.apps.dashboard.capability.label.host_pid"
                    )
                  )}
                >
                  <ha-svg-icon slot="icon" .path=${mdiPound}></ha-svg-icon>
                </ha-assist-chip>
              `
            : nothing}
          ${this._currentAddon.apparmor !== "default"
            ? html`
                <ha-assist-chip
                  filled
                  @click=${this._showMoreInfo}
                  class=${this._computeApparmorClassName}
                  id="apparmor"
                  .label=${capitalizeFirstLetter(
                    this.i18n.localize(
                      "ui.panel.config.apps.dashboard.capability.label.apparmor"
                    )
                  )}
                >
                  <ha-svg-icon slot="icon" .path=${mdiShield}></ha-svg-icon>
                </ha-assist-chip>
              `
            : nothing}
          ${this._currentAddon.auth_api
            ? html`
                <ha-assist-chip
                  filled
                  @click=${this._showMoreInfo}
                  id="auth_api"
                  .label=${capitalizeFirstLetter(
                    this.i18n.localize(
                      "ui.panel.config.apps.dashboard.capability.label.auth"
                    )
                  )}
                >
                  <ha-svg-icon slot="icon" .path=${mdiKey}></ha-svg-icon>
                </ha-assist-chip>
              `
            : nothing}
          ${this._currentAddon.ingress
            ? html`
                <ha-assist-chip
                  filled
                  @click=${this._showMoreInfo}
                  id="ingress"
                  .label=${capitalizeFirstLetter(
                    this.i18n.localize(
                      "ui.panel.config.apps.dashboard.capability.label.ingress"
                    )
                  )}
                >
                  <ha-svg-icon
                    slot="icon"
                    .path=${mdiCursorDefaultClickOutline}
                  ></ha-svg-icon>
                </ha-assist-chip>
              `
            : nothing}
          ${this._currentAddon.signed
            ? html`
                <ha-assist-chip
                  filled
                  @click=${this._showMoreInfo}
                  id="signed"
                  .label=${capitalizeFirstLetter(
                    this.i18n.localize(
                      "ui.panel.config.apps.dashboard.capability.label.signed"
                    )
                  )}
                >
                  <ha-svg-icon slot="icon" .path=${mdiLinkLock}></ha-svg-icon>
                </ha-assist-chip>
              `
            : nothing}
          ${systemManaged
            ? html`
                <ha-assist-chip
                  filled
                  @click=${this._showSystemManagedInfo}
                  id="system_managed"
                  .label=${capitalizeFirstLetter(
                    this.i18n.localize(
                      "ui.panel.config.apps.dashboard.system_managed.badge"
                    )
                  )}
                >
                  <ha-svg-icon
                    slot="icon"
                    .path=${mdiHomeAssistant}
                  ></ha-svg-icon>
                </ha-assist-chip>
              `
            : nothing}
        </ha-chip-set>

        <div class="description">
          ${this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing}
          ${this._currentAddon.description}.<br />
          ${this.i18n.localize(
            "ui.panel.config.apps.dashboard.visit_app_page",
            {
              name: html`<a
                href=${this._currentAddon.url!}
                target="_blank"
                rel="noreferrer"
                >${getAppDisplayName(
                  this._currentAddon.name,
                  this._currentAddon.stage
                )}</a
              >`,
            }
          )}
        </div>
      </div>
      ${(this._currentAddon.update_available && this._updateEntityId) ||
      this._computeShowWebUI ||
      this._computeShowIngressUI ||
      !this._currentAddon.version
        ? html`
            <div class="card-actions">
              ${this._currentAddon.update_available && this._updateEntityId
                ? html`
                    <ha-button appearance="filled" @click=${this._openUpdate}>
                      <ha-svg-icon
                        slot="start"
                        .path=${mdiArrowUpBoldCircleOutline}
                      ></ha-svg-icon>
                      ${this.i18n.localize("ui.common.update")}
                    </ha-button>
                  `
                : nothing}
              ${this._computeShowWebUI || this._computeShowIngressUI
                ? html`
                    <ha-button
                      href=${ifDefined(
                        !this._computeShowIngressUI ? this._pathWebui! : nothing
                      )}
                      target=${ifDefined(
                        !this._computeShowIngressUI ? "_blank" : nothing
                      )}
                      rel=${ifDefined(
                        !this._computeShowIngressUI ? "noopener" : nothing
                      )}
                      @click=${!this._computeShowWebUI
                        ? this._openIngress
                        : undefined}
                    >
                      ${this.i18n.localize(
                        "ui.panel.config.apps.dashboard.open_web_ui"
                      )}
                    </ha-button>
                  `
                : nothing}
              ${!this._currentAddon.version
                ? html`
                    <ha-progress-button
                      .disabled=${!this._currentAddon.available}
                      @click=${this._installClicked}
                      .iconPath=${mdiApplicationImport}
                    >
                      ${this.i18n.localize(
                        "ui.panel.config.apps.dashboard.install"
                      )}
                    </ha-progress-button>
                  `
                : nothing}
            </div>
          `
        : nothing}
    </ha-card>`;
  }

  private _renderDescriptionCard() {
    if (!this.addon.long_description) {
      return nothing;
    }

    return html`
      <ha-card class="long-description" outlined>
        <div class="card-content">
          <ha-markdown
            .content=${this.addon.long_description}
            lazy-images
          ></ha-markdown>
        </div>
      </ha-card>
    `;
  }

  private _renderControlsCard() {
    const systemManaged = this._isSystemManaged(this._currentAddon);
    const metrics = [
      {
        description: this.i18n.localize(
          "ui.panel.config.apps.dashboard.cpu_usage"
        ),
        value: this._metrics?.cpu_percent,
      },
      {
        description: this.i18n.localize(
          "ui.panel.config.apps.dashboard.ram_usage"
        ),
        value: this._metrics?.memory_percent,
        tooltip: `${bytesToString(this._metrics?.memory_usage)}/${bytesToString(
          this._metrics?.memory_limit
        )}`,
      },
    ];

    return html`
      <ha-card class="controls" outlined>
        <div class="title">
          <span>
            ${this.i18n.localize("ui.panel.config.apps.dashboard.controls")}
          </span>
          ${this._currentAddon.version
            ? html`<ha-dropdown placement="bottom-end">
                <ha-icon-button
                  slot="trigger"
                  .label=${this.i18n.localize("ui.common.menu")}
                  .path=${mdiDotsVertical}
                ></ha-icon-button>

                <ha-dropdown-item
                  variant="danger"
                  appearance="plain"
                  @click=${this._uninstallClicked}
                  .disabled=${(systemManaged && !this.controlEnabled) ||
                  this._uninstalling}
                >
                  <ha-svg-icon
                    slot="icon"
                    .path=${mdiPackageVariantRemove}
                  ></ha-svg-icon>
                  ${this.i18n.localize(
                    "ui.panel.config.apps.dashboard.uninstall"
                  )}
                </ha-dropdown-item>
                ${this._currentAddon.build
                  ? html`
                      <ha-dropdown-item
                        variant="danger"
                        @click=${this._rebuildClicked}
                      >
                        <ha-svg-icon
                          slot="icon"
                          .path=${mdiHammer}
                        ></ha-svg-icon>
                        ${this.i18n.localize(
                          "ui.panel.config.apps.dashboard.rebuild"
                        )}
                      </ha-dropdown-item>
                    `
                  : nothing}
              </ha-dropdown>`
            : nothing}
        </div>
        <div class="content">
          ${systemManaged
            ? html`
                <supervisor-app-system-managed
                  .narrow=${this.narrow}
                  .hideButton=${this.controlEnabled}
                ></supervisor-app-system-managed>
              `
            : nothing}
          ${this._uninstalling
            ? html`
                <ha-alert
                  alert-type="error"
                  .title=${this.i18n.localize(
                    "ui.panel.config.apps.dashboard.uninstalling"
                  )}
                >
                  <ha-spinner
                    size="small"
                    slot="icon"
                    indeterminate
                  ></ha-spinner>
                </ha-alert>
              `
            : nothing}
          <div class="actions">
            ${this._computeIsRunning
              ? html`<ha-progress-button
                    variant="danger"
                    @click=${this._stopClicked}
                    .disabled=${(systemManaged && !this.controlEnabled) ||
                    this._uninstalling}
                    .iconPath=${mdiStop}
                  >
                    ${this.i18n.localize("ui.panel.config.apps.dashboard.stop")}
                  </ha-progress-button>
                  <ha-progress-button
                    variant="danger"
                    appearance="filled"
                    @click=${this._restartClicked}
                    .disabled=${(systemManaged && !this.controlEnabled) ||
                    this._uninstalling}
                    .iconPath=${mdiRestart}
                  >
                    ${this.i18n.localize(
                      "ui.panel.config.apps.dashboard.restart"
                    )}
                  </ha-progress-button> `
              : html`<ha-progress-button
                  @click=${this._startClicked}
                  .progress=${(this._currentAddon as HassioAddonDetails)
                    .state === "startup"}
                  .iconPath=${mdiPlay}
                >
                  ${this.i18n.localize("ui.panel.config.apps.dashboard.start")}
                </ha-progress-button>`}
          </div>
          ${this._currentAddon.version
            ? html`
                <wa-divider></wa-divider>
                <ha-row-item>
                  <span slot="headline">
                    ${this.i18n.localize(
                      "ui.panel.config.apps.dashboard.option.boot.title"
                    )}
                  </span>
                  <span slot="supporting-text">
                    ${this.i18n.localize(
                      "ui.panel.config.apps.dashboard.option.boot.description"
                    )}
                  </span>
                  <ha-switch
                    slot="end"
                    .disabled=${(systemManaged && !this.controlEnabled) ||
                    this._uninstalling}
                    @change=${this._startOnBootToggled}
                    .checked=${this._currentAddon.boot === "auto"}
                    haptic
                  ></ha-switch>
                </ha-row-item>

                ${this._currentAddon.startup !== "once"
                  ? html`
                      <ha-row-item>
                        <span slot="headline">
                          ${this.i18n.localize(
                            "ui.panel.config.apps.dashboard.option.watchdog.title"
                          )}
                        </span>
                        <span slot="supporting-text">
                          ${this.i18n.localize(
                            "ui.panel.config.apps.dashboard.option.watchdog.description"
                          )}
                        </span>
                        <ha-switch
                          slot="end"
                          .disabled=${(systemManaged && !this.controlEnabled) ||
                          this._uninstalling}
                          @change=${this._watchdogToggled}
                          .checked=${this._currentAddon.watchdog || false}
                          haptic
                        ></ha-switch>
                      </ha-row-item>
                    `
                  : nothing}
                <ha-row-item>
                  <span slot="headline">
                    ${this.i18n.localize(
                      "ui.panel.config.apps.dashboard.option.auto_update.title"
                    )}
                  </span>
                  <span slot="supporting-text">
                    ${this.i18n.localize(
                      "ui.panel.config.apps.dashboard.option.auto_update.description"
                    )}
                  </span>
                  <ha-switch
                    slot="end"
                    .disabled=${(systemManaged && !this.controlEnabled) ||
                    this._uninstalling}
                    @change=${this._autoUpdateToggled}
                    .checked=${this._currentAddon.auto_update}
                    haptic
                  ></ha-switch>
                </ha-row-item>
                ${!this._computeCannotIngressSidebar &&
                this._currentAddon.ingress
                  ? html`
                      <ha-row-item>
                        <span slot="headline">
                          ${this.i18n.localize(
                            "ui.panel.config.apps.dashboard.option.ingress_panel.title"
                          )}
                        </span>
                        <span slot="supporting-text">
                          ${this.i18n.localize(
                            "ui.panel.config.apps.dashboard.option.ingress_panel.description"
                          )}
                        </span>
                        <ha-switch
                          slot="end"
                          .disabled=${(systemManaged && !this.controlEnabled) ||
                          this._uninstalling}
                          @change=${this._panelToggled}
                          .checked=${this._currentAddon.ingress_panel}
                          haptic
                        ></ha-switch>
                      </ha-row-item>
                    `
                  : nothing}
                ${this._computeUsesProtectedOptions
                  ? html`
                      <ha-row-item>
                        <span slot="headline">
                          ${this.i18n.localize(
                            "ui.panel.config.apps.dashboard.option.protected.title"
                          )}
                        </span>
                        <span slot="supporting-text">
                          ${this.i18n.localize(
                            "ui.panel.config.apps.dashboard.option.protected.description"
                          )}
                        </span>
                        <ha-switch
                          slot="end"
                          .disabled=${(systemManaged && !this.controlEnabled) ||
                          this._uninstalling}
                          @change=${this._protectionToggled}
                          .checked=${this._currentAddon.protected}
                          haptic
                        ></ha-switch>
                      </ha-row-item>
                    `
                  : nothing}
              `
            : nothing}
          ${this._currentAddon.version && this._currentAddon.state === "started"
            ? html`<wa-divider></wa-divider>
                <ha-row-item>
                  <span slot="supporting-text">
                    ${this.i18n.localize(
                      "ui.panel.config.apps.dashboard.hostname"
                    )}
                  </span>
                  <code slot="headline"> ${this._currentAddon.hostname} </code>
                </ha-row-item>
                ${metrics.map(
                  (metric) => html`
                    <supervisor-app-metric
                      .description=${metric.description}
                      .value=${metric.value ?? 0}
                      .tooltip=${metric.tooltip}
                    ></supervisor-app-metric>
                  `
                )}`
            : nothing}
        </div>
      </ha-card>
    `;
  }

  protected render(): TemplateResult {
    return html`
      ${"protected" in this._currentAddon && !this._currentAddon.protected
        ? html`
            <ha-alert
              alert-type="error"
              .title=${this.i18n.localize(
                "ui.panel.config.apps.dashboard.protection_mode.title"
              )}
            >
              ${this.i18n.localize(
                "ui.panel.config.apps.dashboard.protection_mode.content"
              )}
              <ha-button
                variant="danger"
                slot="action"
                @click=${this._protectionToggled}
              >
                ${this.i18n.localize(
                  "ui.panel.config.apps.dashboard.protection_mode.enable"
                )}
              </ha-button>
            </ha-alert>
          `
        : nothing}
      <div
        class="app ${this._isMobileSize || !this._currentAddon.version
          ? "column"
          : ""}"
      >
        ${this._isMobileSize || !this._currentAddon.version
          ? html`
              ${this._renderInfoCard()}
              ${this._currentAddon.version
                ? this._renderControlsCard()
                : nothing}
              ${this._renderDescriptionCard()}
            `
          : html`<div class="info-column">
                ${this._renderInfoCard()} ${this._renderDescriptionCard()}
              </div>
              <div class="control-column">${this._renderControlsCard()}</div>`}
      </div>
    `;
  }

  protected updated(changedProps: PropertyValues<this>) {
    super.updated(changedProps);
    if (changedProps.has("addon")) {
      this._loadMetrics();
    }
  }

  private _startPolling() {
    if (this._pollInterval) {
      return;
    }
    this._pollInterval = window.setInterval(() => {
      this._refreshAddonInfo();
    }, POLL_INTERVAL_SECONDS * 1000);
  }

  private _stopPolling() {
    if (this._pollInterval) {
      clearInterval(this._pollInterval);
      this._pollInterval = undefined;
    }
  }

  private async _refreshAddonInfo(): Promise<void> {
    const addon = this._currentAddon;
    if (!addon?.slug) {
      return;
    }
    try {
      this._addon = await fetchHassioAddonInfo(this.api.callWS, addon.slug);
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error("Failed to fetch addon info", err);
    }
  }

  private async _loadMetrics(): Promise<void> {
    const addon = this._currentAddon;
    if ("state" in addon && addon.state === "started") {
      this._metrics = await fetchHassioStats(
        this.api.callWS,
        `addons/${addon.slug}`
      );
    }
  }

  private get _computeHassioApi(): boolean {
    const addon = this._currentAddon;
    return (
      addon.hassio_api &&
      (addon.hassio_role === "manager" || addon.hassio_role === "admin")
    );
  }

  private get _computeApparmorClassName(): string {
    const addon = this._currentAddon;
    if (addon.apparmor === "profile") {
      return "green";
    }
    if (addon.apparmor === "disable") {
      return "red";
    }
    return "";
  }

  private _showMoreInfo(ev): void {
    const id = ev.currentTarget.id as AddonCapability;
    showAlertDialog(this, {
      title: this.i18n.localize(
        `ui.panel.config.apps.dashboard.capability.${id}.title` as LocalizeKeys
      ),
      text: this.i18n.localize(
        `ui.panel.config.apps.dashboard.capability.${id}.description`
      ),
    });
  }

  private _showSystemManagedInfo() {
    showAlertDialog(this, {
      title: this.i18n.localize(
        "ui.panel.config.apps.dashboard.system_managed.title"
      ),
      text: this.i18n.localize(
        "ui.panel.config.apps.dashboard.system_managed.description"
      ),
    });
  }

  private get _computeIsRunning(): boolean {
    const addon = this._currentAddon as HassioAddonDetails;
    return addon?.state === "started";
  }

  private get _pathWebui(): string | null {
    const addon = this._currentAddon as HassioAddonDetails;
    return addon.webui!.replace("[HOST]", document.location.hostname);
  }

  private get _computeShowWebUI(): boolean | "" | null {
    const addon = this._currentAddon as HassioAddonDetails;
    return !addon.ingress && addon.webui && this._computeIsRunning;
  }

  private _openIngress(): void {
    navigate(`/app/${this.addon.slug}`);
  }

  private get _computeShowIngressUI(): boolean {
    const addon = this._currentAddon as HassioAddonDetails;
    return addon.ingress && this._computeIsRunning;
  }

  private get _computeCannotIngressSidebar(): boolean {
    const addon = this._currentAddon as HassioAddonDetails;
    return !addon.ingress;
  }

  private get _computeUsesProtectedOptions(): boolean {
    const addon = this._currentAddon as HassioAddonDetails;
    return addon.docker_api || addon.full_access || addon.host_pid;
  }

  private async _startOnBootToggled(): Promise<void> {
    this._error = undefined;
    const addon = this._currentAddon as HassioAddonDetails;
    const data: HassioAddonSetOptionParams = {
      boot: addon.boot === "auto" ? "manual" : "auto",
    };
    try {
      await setHassioAddonOption(this.api.callWS, addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err: any) {
      this._error = this.i18n.localize(
        "ui.panel.config.apps.dashboard.failed_to_save",
        {
          error: extractApiErrorMessage(err),
        }
      );
    }
  }

  private async _watchdogToggled(): Promise<void> {
    this._error = undefined;
    const addon = this._currentAddon as HassioAddonDetails;
    const data: HassioAddonSetOptionParams = {
      watchdog: !addon.watchdog,
    };
    try {
      await setHassioAddonOption(this.api.callWS, addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err: any) {
      this._error = this.i18n.localize(
        "ui.panel.config.apps.dashboard.failed_to_save",
        {
          error: extractApiErrorMessage(err),
        }
      );
    }
  }

  private async _autoUpdateToggled(): Promise<void> {
    this._error = undefined;
    const addon = this._currentAddon as HassioAddonDetails;
    const data: HassioAddonSetOptionParams = {
      auto_update: !addon.auto_update,
    };
    try {
      await setHassioAddonOption(this.api.callWS, addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err: any) {
      this._error = this.i18n.localize(
        "ui.panel.config.apps.dashboard.failed_to_save",
        {
          error: extractApiErrorMessage(err),
        }
      );
    }
  }

  private async _protectionToggled(): Promise<void> {
    this._error = undefined;
    const addon = this._currentAddon as HassioAddonDetails;
    const data: HassioAddonSetSecurityParams = {
      protected: !addon.protected,
    };
    try {
      await setHassioAddonSecurity(this.api.callWS, addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "security",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err: any) {
      this._error = this.i18n.localize(
        "ui.panel.config.apps.dashboard.failed_to_save",
        {
          error: extractApiErrorMessage(err),
        }
      );
    }
  }

  private async _panelToggled(): Promise<void> {
    this._error = undefined;
    const addon = this._currentAddon as HassioAddonDetails;
    const data: HassioAddonSetOptionParams = {
      ingress_panel: !addon.ingress_panel,
    };
    try {
      await setHassioAddonOption(this.api.callWS, addon.slug, data);
      const eventdata = {
        success: true,
        response: undefined,
        path: "option",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err: any) {
      this._error = this.i18n.localize(
        "ui.panel.config.apps.dashboard.failed_to_save",
        {
          error: extractApiErrorMessage(err),
        }
      );
    }
  }

  private async _openChangelog(): Promise<void> {
    try {
      const addon = this._currentAddon as HassioAddonDetails;
      const content = await fetchHassioAddonChangelog(this.api, addon.slug);

      showAlertDialog(this, {
        title: this.i18n.localize("ui.panel.config.apps.dashboard.changelog"),
        text: html`<ha-markdown
          .content=${extractChangelog(addon, content)}
        ></ha-markdown>`,
      });
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.i18n.localize(
          "ui.panel.config.apps.dashboard.action_error.get_changelog"
        ),
        text: extractApiErrorMessage(err),
      });
    }
  }

  private async _installClicked(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    const addon = this._currentAddon as HassioAddonDetails;

    try {
      await installHassioAddon(this.api.callWS, addon.slug);
      const eventdata = {
        success: true,
        response: undefined,
        path: "install",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err: any) {
      showConfirmationDialog(this, {
        title: this.i18n.localize(
          "ui.panel.config.apps.dashboard.action_error.install"
        ),
        text: extractApiErrorMessage(err),
        confirmText: this.i18n.localize("ui.common.ok"),
        dismissText: this.i18n.localize(
          "ui.panel.config.apps.dashboard.action_error.view_supervisor_logs"
        ),
        cancel: () => navigate("/config/logs?provider=supervisor"),
      });
    }
    button.progress = false;
    this._refreshAddonInfo();
  }

  private async _stopClicked(ev: CustomEvent): Promise<void> {
    const addon = this._currentAddon as HassioAddonDetails;
    if (this._isSystemManaged(addon) && !this.controlEnabled) {
      return;
    }

    const button = ev.currentTarget as any;
    button.progress = true;

    try {
      await stopHassioAddon(this.api.callWS, addon.slug);
      const eventdata = {
        success: true,
        response: undefined,
        path: "stop",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.i18n.localize(
          "ui.panel.config.apps.dashboard.action_error.stop"
        ),
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
    this._refreshAddonInfo();
  }

  private async _restartClicked(ev: CustomEvent): Promise<void> {
    const addon = this._currentAddon as HassioAddonDetails;
    if (this._isSystemManaged(addon) && !this.controlEnabled) {
      return;
    }

    const button = ev.currentTarget as any;
    button.progress = true;

    try {
      await restartHassioAddon(this.api.callWS, addon.slug);
      const eventdata = {
        success: true,
        response: undefined,
        path: "restart",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.i18n.localize(
          "ui.panel.config.apps.dashboard.action_error.restart"
        ),
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
    this._refreshAddonInfo();
  }

  private async _rebuildClicked(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;

    const addon = this._currentAddon as HassioAddonDetails;

    try {
      await rebuildLocalAddon(this.api.callWS, addon.slug);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.i18n.localize(
          "ui.panel.config.apps.dashboard.action_error.rebuild"
        ),
        text: extractApiErrorMessage(err),
      });
    }
    button.progress = false;
    this._refreshAddonInfo();
  }

  private async _startClicked(ev: CustomEvent): Promise<void> {
    const button = ev.currentTarget as any;
    button.progress = true;
    const addon = this._currentAddon as HassioAddonDetails;
    try {
      const validate = await validateHassioAddonOption(
        this.api.callWS,
        addon.slug
      );
      if (!validate.valid) {
        await showConfirmationDialog(this, {
          title: this.i18n.localize(
            "ui.panel.config.apps.dashboard.action_error.start_invalid_config"
          ),
          text: validate.message.split(" Got ")[0],
          confirm: () => this._openConfiguration(),
          confirmText: this.i18n.localize(
            "ui.panel.config.apps.dashboard.action_error.go_to_config"
          ),
          dismissText: this.i18n.localize("ui.common.cancel"),
        });
        button.actionError();
        button.progress = false;
        return;
      }
    } catch (err: any) {
      button.actionError();
      button.progress = false;
      showAlertDialog(this, {
        title: this.i18n.localize(
          "ui.panel.config.apps.dashboard.action_error.validate_config"
        ),
        text: extractApiErrorMessage(err),
      });
      return;
    }

    try {
      await startHassioAddon(this.api.callWS, addon.slug);
      this._addon = await fetchHassioAddonInfo(this.api.callWS, addon.slug);
      const eventdata = {
        success: true,
        response: undefined,
        path: "start",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err: any) {
      button.actionError();
      button.progress = false;
      showAlertDialog(this, {
        title: this.i18n.localize(
          "ui.panel.config.apps.dashboard.action_error.start"
        ),
        text: extractApiErrorMessage(err),
      });
      return;
    }
    button.actionSuccess();
    button.progress = false;
    this._refreshAddonInfo();
  }

  private _openConfiguration(): void {
    const addon = this._currentAddon as HassioAddonDetails;
    navigate(`/config/app/${addon.slug}/config`);
  }

  private async _uninstallClicked(): Promise<void> {
    const addon = this._currentAddon as HassioAddonDetails;
    if (this._isSystemManaged(addon) && !this.controlEnabled) {
      return;
    }

    let removeData = false;
    const _removeDataToggled = (e: Event) => {
      removeData = (e.target as HaSwitch).checked;
    };

    const confirmed = await showConfirmationDialog(this, {
      title: this.i18n.localize(
        "ui.panel.config.apps.dashboard.uninstall_dialog.title",
        {
          name: getAppDisplayName(addon.name, addon.stage),
        }
      ),
      text: html`
        <ha-formfield
          .label=${html`<p>
            ${this.i18n.localize(
              "ui.panel.config.apps.dashboard.uninstall_dialog.remove_data"
            )}
          </p>`}
        >
          <ha-switch
            @change=${_removeDataToggled}
            .checked=${removeData}
            haptic
          ></ha-switch>
        </ha-formfield>
      `,
      confirmText: this.i18n.localize(
        "ui.panel.config.apps.dashboard.uninstall_dialog.uninstall"
      ),
      dismissText: this.i18n.localize("ui.common.cancel"),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    this._uninstalling = true;
    this._error = undefined;
    try {
      await uninstallHassioAddon(this.api.callWS, addon.slug, removeData);
      const eventdata = {
        success: true,
        response: undefined,
        path: "uninstall",
      };
      fireEvent(this, "hass-api-called", eventdata);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.i18n.localize(
          "ui.panel.config.apps.dashboard.action_error.uninstall"
        ),
        text: extractApiErrorMessage(err),
      });
    } finally {
      this._uninstalling = false;
      this._refreshAddonInfo();
    }
  }

  private _isSystemManaged = memoizeOne(
    (addon: HassioAddonDetails | StoreAddonDetails) =>
      "system_managed" in addon && addon.system_managed
  );

  private _computeUpdateEntityId() {
    const addon = this._currentAddon as HassioAddonDetails;
    const device = Object.values(this.registries.devices).find((d) =>
      d.identifiers.some(
        ([domain, id]) => domain === "hassio" && id === addon.slug
      )
    );
    if (!device) {
      return;
    }
    const updateEntity = Object.values(this.registries.entities).find(
      (e) =>
        e.device_id === device.id && computeDomain(e.entity_id) === "update"
    );
    if (!updateEntity) {
      return;
    }

    this._updateEntityId = updateEntity.entity_id;
  }

  private _openUpdate() {
    showMoreInfoDialog(this, { entityId: this._updateEntityId! });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }

        .app {
          display: flex;
          gap: var(--ha-space-4);
          max-width: 1200px;
        }
        .app.column {
          flex-direction: column;
          gap: var(--ha-space-2);
        }
        @media (max-width: 1120px) {
          .app {
            flex-direction: column;
            gap: var(--ha-space-2);
          }
        }

        .info-column {
          display: flex;
          flex-direction: column;
          gap: var(--ha-space-4);
          flex: 2;
          min-width: 0;
        }

        .control-column {
          flex: 1;
          min-width: min(480px, 100%);
        }

        .controls .title {
          display: flex;
        }

        .controls .title span {
          flex: 1;
          font-size: var(--ha-font-size-l);
          font-weight: var(--ha-font-weight-medium);
          padding: var(--ha-space-3) var(--ha-space-4) 0;
          color: var(--ha-color-text-secondary);
        }

        .controls ha-row-item::part(supporting-text) {
          white-space: normal;
        }

        .controls .content {
          display: flex;
          flex-direction: column;
        }

        .controls .content .actions {
          display: flex;
          justify-content: flex-start;
          padding-inline: var(--ha-space-4);
          gap: var(--ha-space-3);
        }

        wa-divider {
          margin-inline: var(--ha-space-4);
        }

        ha-card {
          display: block;
        }
        .addon-header {
          display: flex;
          font-size: var(--ha-font-size-2xl);
          color: var(--ha-card-header-color, var(--primary-text-color));
          align-items: center;
          gap: var(--ha-space-2);
          flex-wrap: wrap;
          margin-bottom: var(--ha-space-4);
        }

        .addon-header .title {
          flex: 1;
          margin-inline-end: var(--ha-space-4);
        }

        .addon-header .title .description {
          font-size: var(--ha-font-size-s);
        }

        .addon-header supervisor-apps-state,
        .addon-header supervisor-apps-tag {
          align-self: start;
          display: inline-flex;
          height: 24px;
          align-items: center;
        }

        .errors {
          color: var(--error-color);
          margin-bottom: var(--ha-space-4);
        }
        .description a {
          color: var(--primary-color);
        }

        img.logo {
          max-width: 100%;
          max-height: 40px;
          display: block;
          margin-bottom: var(--ha-space-2);
        }
        ha-assist-chip {
          --md-sys-color-primary: var(--text-primary-color);
          --md-sys-color-on-surface: var(--text-primary-color);
          --ha-assist-chip-filled-container-color: var(--primary-color);
        }

        ha-assist-chip.red {
          --ha-assist-chip-filled-container-color: var(
            --label-badge-red,
            #df4c1e
          );
        }
        ha-assist-chip.blue {
          --ha-assist-chip-filled-container-color: var(
            --label-badge-blue,
            #039be5
          );
        }
        ha-assist-chip.green {
          --ha-assist-chip-filled-container-color: var(
            --label-badge-green,
            #0da035
          );
        }
        ha-assist-chip.yellow {
          --ha-assist-chip-filled-container-color: var(
            --label-badge-yellow,
            #f4b400
          );
        }
        .capabilities {
          margin-bottom: var(--ha-space-4);
        }
        .card-actions {
          justify-content: flex-end;
          display: flex;
          gap: var(--ha-space-2);
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
          padding: var(--ha-space-4);
          --markdown-image-background-color: transparent;
          --markdown-image-border-radius: 0;
          --markdown-image-min-height: auto;
          --markdown-image-text-indent: 0;
          --markdown-image-transition: none;
        }

        ha-alert {
          display: block;
          margin-bottom: var(--ha-space-4);
        }

        ha-alert ha-button {
          --mdc-theme-primary: var(--primary-text-color);
        }

        a {
          text-decoration: none;
        }
      `,
    ];
  }
}
declare global {
  interface HTMLElementTagNameMap {
    "supervisor-app-info": SupervisorAppInfo;
  }
}
