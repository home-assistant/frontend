import "@lrnwebcomponents/simple-tooltip/simple-tooltip";
import "@material/mwc-list/mwc-list";
import { RequestSelectedDetail } from "@material/mwc-list/mwc-list-item-base";
import {
  mdiAlertCircle,
  mdiBookshelf,
  mdiBug,
  mdiBugPlay,
  mdiBugStop,
  mdiCloud,
  mdiCog,
  mdiDelete,
  mdiDevices,
  mdiDotsVertical,
  mdiDownload,
  mdiHandExtendedOutline,
  mdiOpenInNew,
  mdiPackageVariant,
  mdiPlayCircleOutline,
  mdiProgressHelper,
  mdiReload,
  mdiReloadAlert,
  mdiRenameBox,
  mdiShapeOutline,
  mdiStopCircleOutline,
} from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { isDevVersion } from "../../../common/config/version";
import { shouldHandleRequestSelectedEvent } from "../../../common/mwc/handle-request-selected-event";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import { nextRender } from "../../../common/util/render-status";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-list-item";
import {
  deleteApplicationCredential,
  fetchApplicationCredentialsConfigEntry,
} from "../../../data/application_credential";
import { getSignedPath } from "../../../data/auth";
import {
  ConfigEntry,
  deleteConfigEntry,
  disableConfigEntry,
  DisableConfigEntryResult,
  enableConfigEntry,
  ERROR_STATES,
  getConfigEntries,
  RECOVERABLE_STATES,
  reloadConfigEntry,
  updateConfigEntry,
} from "../../../data/config_entries";
import { ATTENTION_SOURCES } from "../../../data/config_flow";
import { DeviceRegistryEntry } from "../../../data/device_registry";
import {
  DiagnosticInfo,
  fetchDiagnosticHandler,
  getConfigEntryDiagnosticsDownloadUrl,
} from "../../../data/diagnostics";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../../data/entity_registry";
import { getErrorLogDownloadUrl } from "../../../data/error_log";
import {
  domainToName,
  fetchIntegrationManifest,
  integrationIssuesUrl,
  IntegrationLogInfo,
  IntegrationManifest,
  integrationsWithPanel,
  LogSeverity,
  setIntegrationLogLevel,
  subscribeLogInfo,
} from "../../../data/integration";
import { showConfigEntrySystemOptionsDialog } from "../../../dialogs/config-entry-system-options/show-dialog-config-entry-system-options";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { showOptionsFlowDialog } from "../../../dialogs/config-flow/show-dialog-options-flow";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { documentationUrl } from "../../../util/documentation-url";
import { fileDownload } from "../../../util/file_download";
import { DataEntryFlowProgressExtended } from "./ha-config-integrations";
import { showAddIntegrationDialog } from "./show-add-integration-dialog";

@customElement("ha-config-integration-page")
class HaConfigIntegrationPage extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public domain!: string;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property({ type: Boolean }) public showAdvanced!: boolean;

  @property() public configEntries?: ConfigEntry[];

  @property({ attribute: false })
  public configEntriesInProgress: DataEntryFlowProgressExtended[] = [];

  @state() private _entities: EntityRegistryEntry[] = [];

  @state() private _manifest?: IntegrationManifest;

  @state() private _extraConfigEntries?: ConfigEntry[];

  @state() private _diagnosticHandler?: DiagnosticInfo;

  @state() private _logInfo?: IntegrationLogInfo;

  @state() private _searchParms = new URLSearchParams(
    window.location.hash.substring(1)
  );

  private _configPanel = memoizeOne(
    (domain: string, panels: HomeAssistant["panels"]): string | undefined =>
      Object.values(panels).find(
        (panel) => panel.config_panel_domain === domain
      )?.url_path || integrationsWithPanel[domain]
  );

  private _domainConfigEntries = memoizeOne(
    (domain: string, configEntries?: ConfigEntry[]): ConfigEntry[] =>
      configEntries
        ? configEntries.filter((entry) => entry.domain === domain)
        : []
  );

  private _domainConfigEntriesInProgress = memoizeOne(
    (
      domain: string,
      configEntries?: DataEntryFlowProgressExtended[]
    ): DataEntryFlowProgressExtended[] =>
      configEntries
        ? configEntries.filter((entry) => entry.handler === domain)
        : []
  );

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entities = entities;
      }),
      subscribeLogInfo(this.hass.connection, (log_infos) => {
        for (const log_info of log_infos) {
          if (log_info.domain === this.domain) {
            this._logInfo = log_info;
          }
        }
      }),
    ];
  }

  protected willUpdate(changedProperties: PropertyValues): void {
    if (changedProperties.has("domain")) {
      this.hass.loadBackendTranslation("title", [this.domain]);
      this._extraConfigEntries = undefined;
      this._fetchManifest();
      this._fetchDiagnostics();
    }
  }

  protected updated(changed: PropertyValues) {
    super.updated(changed);
    if (
      this._searchParms.has("config_entry") &&
      changed.has("configEntries") &&
      !changed.get("configEntries") &&
      this.configEntries
    ) {
      this._highlightEntry();
    }
  }

  protected render() {
    if (!this.configEntries || !this.domain) {
      return nothing;
    }

    const configEntries = this._domainConfigEntries(
      this.domain,
      this._extraConfigEntries || this.configEntries
    );

    const configEntriesInProgress = this._domainConfigEntriesInProgress(
      this.domain,
      this.configEntriesInProgress
    );

    const discoveryFlows = configEntriesInProgress.filter(
      (flow) => !ATTENTION_SOURCES.includes(flow.context.source)
    );

    const attentionFlows = configEntriesInProgress.filter((flow) =>
      ATTENTION_SOURCES.includes(flow.context.source)
    );

    const attentionEntries = configEntries.filter((entry) =>
      ERROR_STATES.includes(entry.state)
    );

    const normalEntries = configEntries
      .filter(
        (entry) =>
          entry.source !== "ignore" && !ERROR_STATES.includes(entry.state)
      )
      .sort((a, b) => {
        if (Boolean(a.disabled_by) !== Boolean(b.disabled_by)) {
          return a.disabled_by ? 1 : -1;
        }
        return caseInsensitiveStringCompare(
          a.title,
          b.title,
          this.hass.locale.language
        );
      });

    const devices = this._getDevices(configEntries, this.hass.devices);
    const entities = this._getEntities(configEntries, this._entities);

    const services = !devices.some((device) => device.entry_type !== "service");

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .header=${domainToName(this.hass.localize, this.domain)}
      >
        <div class="container">
          <div class="column small">
            <ha-card class="overview">
              <div class="card-content">
                <div class="logo-container">
                  <img
                    alt=${domainToName(this.hass.localize, this.domain)}
                    src=${brandsUrl({
                      domain: this.domain,
                      type: "logo",
                      darkOptimized: this.hass.themes?.darkMode,
                    })}
                    crossorigin="anonymous"
                    referrerpolicy="no-referrer"
                    @load=${this._onImageLoad}
                    @error=${this._onImageError}
                  />
                </div>
                ${this._manifest?.is_built_in === false
                  ? html`<ha-alert alert-type="warning"
                      ><ha-svg-icon
                        slot="icon"
                        path=${mdiPackageVariant}
                      ></ha-svg-icon>
                      ${this.hass.localize(
                        "ui.panel.config.integrations.config_entry.custom_integration"
                      )}</ha-alert
                    >`
                  : ""}
                ${this._manifest?.iot_class?.startsWith("cloud_")
                  ? html`<ha-alert
                      ><ha-svg-icon slot="icon" path=${mdiCloud}></ha-svg-icon
                      >${this.hass.localize(
                        "ui.panel.config.integrations.config_entry.depends_on_cloud"
                      )}</ha-alert
                    >`
                  : ""}
              </div>

              <div class="card-actions">
                ${devices.length > 0
                  ? html`<a
                      href=${devices.length === 1
                        ? `/config/devices/device/${devices[0].id}`
                        : `/config/devices/dashboard?historyBack=1&domain=${this.domain}`}
                    >
                      <ha-list-item hasMeta graphic="icon">
                        <ha-svg-icon
                          .path=${services
                            ? mdiHandExtendedOutline
                            : mdiDevices}
                          slot="graphic"
                        ></ha-svg-icon>
                        ${this.hass.localize(
                          `ui.panel.config.integrations.config_entry.${
                            services ? "services" : "devices"
                          }`,
                          "count",
                          devices.length
                        )}
                        <ha-icon-next slot="meta"></ha-icon-next>
                      </ha-list-item>
                    </a>`
                  : ""}
                ${entities.length > 0
                  ? html`<a
                      href=${`/config/entities?historyBack=1&domain=${this.domain}`}
                    >
                      <ha-list-item hasMeta graphic="icon">
                        <ha-svg-icon
                          .path=${mdiShapeOutline}
                          slot="graphic"
                        ></ha-svg-icon>
                        ${this.hass.localize(
                          `ui.panel.config.integrations.config_entry.entities`,
                          "count",
                          entities.length
                        )}
                        <ha-icon-next slot="meta"></ha-icon-next>
                      </ha-list-item>
                    </a>`
                  : ""}
                ${this._manifest
                  ? html`<a
                      href=${this._manifest.is_built_in
                        ? documentationUrl(
                            this.hass,
                            `/integrations/${this._manifest.domain}`
                          )
                        : this._manifest.documentation}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ha-list-item graphic="icon" hasMeta>
                        ${this.hass.localize(
                          "ui.panel.config.integrations.config_entry.documentation"
                        )}
                        <ha-svg-icon
                          slot="graphic"
                          .path=${mdiBookshelf}
                        ></ha-svg-icon>
                        <ha-svg-icon
                          slot="meta"
                          .path=${mdiOpenInNew}
                        ></ha-svg-icon>
                      </ha-list-item>
                    </a>`
                  : ""}
                ${this._manifest &&
                (this._manifest.is_built_in || this._manifest.issue_tracker)
                  ? html`<a
                      href=${integrationIssuesUrl(this.domain, this._manifest)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ha-list-item graphic="icon" hasMeta>
                        ${this.hass.localize(
                          "ui.panel.config.integrations.config_entry.known_issues"
                        )}
                        <ha-svg-icon
                          slot="graphic"
                          .path=${mdiBug}
                        ></ha-svg-icon>
                        <ha-svg-icon
                          slot="meta"
                          .path=${mdiOpenInNew}
                        ></ha-svg-icon>
                      </ha-list-item>
                    </a>`
                  : ""}
                ${this._logInfo
                  ? html`<ha-list-item
                      @request-selected=${this._logInfo.level ===
                      LogSeverity.DEBUG
                        ? this._handleDisableDebugLogging
                        : this._handleEnableDebugLogging}
                      graphic="icon"
                    >
                      ${this._logInfo.level === LogSeverity.DEBUG
                        ? this.hass.localize(
                            "ui.panel.config.integrations.config_entry.disable_debug_logging"
                          )
                        : this.hass.localize(
                            "ui.panel.config.integrations.config_entry.enable_debug_logging"
                          )}
                      <ha-svg-icon
                        slot="graphic"
                        class=${this._logInfo.level === LogSeverity.DEBUG
                          ? "warning"
                          : ""}
                        .path=${this._logInfo.level === LogSeverity.DEBUG
                          ? mdiBugStop
                          : mdiBugPlay}
                      ></ha-svg-icon>
                    </ha-list-item>`
                  : ""}
              </div>
            </ha-card>
          </div>
          <div class="column">
            ${discoveryFlows.length
              ? html`<ha-card>
                  <h1 class="card-header">
                    ${this.hass.localize(
                      "ui.panel.config.integrations.discovered"
                    )}
                  </h1>
                  <mwc-list>
                    ${discoveryFlows.map(
                      (flow) =>
                        html`<ha-list-item
                          hasMeta
                          class="discovered"
                          noninteractive
                        >
                          ${flow.localized_title}
                          <ha-button
                            slot="meta"
                            unelevated
                            .flow=${flow}
                            @click=${this._continueFlow}
                            .label=${this.hass.localize(
                              "ui.panel.config.integrations.configure"
                            )}
                          ></ha-button>
                        </ha-list-item>`
                    )}
                  </mwc-list>
                </ha-card>`
              : ""}
            ${attentionFlows.length || attentionEntries.length
              ? html`<ha-card>
                  <h1 class="card-header">
                    ${this.hass.localize(
                      `ui.panel.config.integrations.integration_page.attention_entries`
                    )}
                  </h1>
                  <mwc-list>
                    ${attentionFlows.map((flow) => {
                      const attention = ATTENTION_SOURCES.includes(
                        flow.context.source
                      );
                      return html`<ha-list-item
                        hasMeta
                        class="config_entry ${attention ? "attention" : ""}"
                        twoLine
                        noninteractive
                      >
                        ${flow.localized_title}
                        <span slot="secondary"
                          >${this.hass.localize(
                            `ui.panel.config.integrations.${
                              attention ? "attention" : "discovered"
                            }`
                          )}</span
                        >
                        <ha-button
                          slot="meta"
                          unelevated
                          .flow=${flow}
                          @click=${this._continueFlow}
                          .label=${this.hass.localize(
                            `ui.panel.config.integrations.${
                              attention ? "reconfigure" : "configure"
                            }`
                          )}
                        ></ha-button>
                      </ha-list-item>`;
                    })}
                    ${attentionEntries.map((item) =>
                      this._renderConfigEntry(item)
                    )}
                  </mwc-list>
                </ha-card>`
              : ""}

            <ha-card>
              <h1 class="card-header">
                ${this._manifest?.integration_type
                  ? this.hass.localize(
                      `ui.panel.config.integrations.integration_page.entries_${this._manifest?.integration_type}`
                    )
                  : this.hass.localize(
                      `ui.panel.config.integrations.integration_page.entries`
                    )}
              </h1>
              ${normalEntries.length === 0
                ? html`<div class="card-content no-entries">
                    ${this.hass.localize(
                      "ui.panel.config.integrations.integration_page.no_entries"
                    )}
                  </div>`
                : nothing}
              <mwc-list>
                ${normalEntries.map((item) => this._renderConfigEntry(item))}
              </mwc-list>
              <div class="card-actions">
                <ha-button @click=${this._addIntegration}>
                  ${this._manifest?.integration_type
                    ? this.hass.localize(
                        `ui.panel.config.integrations.integration_page.add_${this._manifest?.integration_type}`
                      )
                    : this.hass.localize(
                        `ui.panel.config.integrations.integration_page.add_entry`
                      )}
                </ha-button>
              </div>
            </ha-card>
          </div>
        </div>
      </hass-subpage>
    `;
  }

  private _onImageLoad(ev) {
    ev.target.style.display = "inline-block";
  }

  private _onImageError(ev) {
    ev.target.style.display = "none";
  }

  private _renderConfigEntry(item: ConfigEntry) {
    let stateText: Parameters<typeof this.hass.localize> | undefined;
    let stateTextExtra: TemplateResult | string | undefined;
    let icon: string = mdiAlertCircle;

    if (!item.disabled_by && item.state === "not_loaded") {
      stateText = ["ui.panel.config.integrations.config_entry.not_loaded"];
    } else if (item.state === "setup_in_progress") {
      icon = mdiProgressHelper;
      stateText = [
        "ui.panel.config.integrations.config_entry.setup_in_progress",
      ];
    } else if (ERROR_STATES.includes(item.state)) {
      if (item.state === "setup_retry") {
        icon = mdiReloadAlert;
      }
      stateText = [
        `ui.panel.config.integrations.config_entry.state.${item.state}`,
      ];
      if (item.reason) {
        this.hass.loadBackendTranslation("config", item.domain);
        stateTextExtra = html`${this.hass.localize(
          `component.${item.domain}.config.error.${item.reason}`
        ) || item.reason}`;
      } else {
        stateTextExtra = html`
          <br />
          ${this.hass.localize(
            "ui.panel.config.integrations.config_entry.check_the_logs"
          )}
        `;
      }
    }

    const devices = this._getConfigEntryDevices(item);
    const services = this._getConfigEntryServices(item);
    const entities = this._getConfigEntryEntities(item);

    let devicesLine: (TemplateResult | string)[] = [];

    if (item.disabled_by) {
      devicesLine.push(
        this.hass.localize(
          "ui.panel.config.integrations.config_entry.disable.disabled_cause",
          {
            cause:
              this.hass.localize(
                `ui.panel.config.integrations.config_entry.disable.disabled_by.${item.disabled_by}`
              ) || item.disabled_by,
          }
        )
      );
      if (item.state === "failed_unload") {
        devicesLine.push(`.
        ${this.hass.localize(
          "ui.panel.config.integrations.config_entry.disable_restart_confirm"
        )}.`);
      }
    } else {
      for (const [items, localizeKey] of [
        [devices, "devices"],
        [services, "services"],
      ] as const) {
        if (items.length === 0) {
          continue;
        }
        const url =
          items.length === 1
            ? `/config/devices/device/${items[0].id}`
            : `/config/devices/dashboard?historyBack=1&config_entry=${item.entry_id}`;
        devicesLine.push(
          // no white space before/after template on purpose
          html`<a href=${url}
            >${this.hass.localize(
              `ui.panel.config.integrations.config_entry.${localizeKey}`,
              "count",
              items.length
            )}</a
          >`
        );
      }

      if (entities.length) {
        devicesLine.push(
          // no white space before/after template on purpose
          html`<a
            href=${`/config/entities?historyBack=1&config_entry=${item.entry_id}`}
            >${this.hass.localize(
              "ui.panel.config.integrations.config_entry.entities",
              "count",
              entities.length
            )}</a
          >`
        );
      }

      if (devicesLine.length === 0) {
        devicesLine = [
          this.hass.localize(
            "ui.panel.config.integrations.config_entry.no_devices_or_entities"
          ),
        ];
      } else if (devicesLine.length === 2) {
        devicesLine = [
          devicesLine[0],
          ` ${this.hass.localize("ui.common.and")} `,
          devicesLine[1],
        ];
      } else if (devicesLine.length === 3) {
        devicesLine = [
          devicesLine[0],
          ", ",
          devicesLine[1],
          ` ${this.hass.localize("ui.common.and")} `,
          devicesLine[2],
        ];
      }
    }

    const configPanel = this._configPanel(item.domain, this.hass.panels);

    return html`<ha-list-item
      hasMeta
      class="config_entry ${classMap({
        "state-not-loaded": item!.state === "not_loaded",
        "state-failed-unload": item!.state === "failed_unload",
        "state-setup": item!.state === "setup_in_progress",
        "state-error": ERROR_STATES.includes(item!.state),
      })}"
      data-entry-id=${item.entry_id}
      .disabled=${item.disabled_by}
      .configEntry=${item}
      twoline
      noninteractive
    >
      ${stateText
        ? html`
            <div class="message" slot="meta">
              <ha-svg-icon .path=${icon}></ha-svg-icon>
              <div>${this.hass.localize(...stateText)}</div>
              ${stateTextExtra
                ? html`<simple-tooltip>${stateTextExtra}</simple-tooltip>`
                : ""}
            </div>
          `
        : ""}
      ${item.title || domainToName(this.hass.localize, item.domain)}
      <span slot="secondary">${devicesLine}</span>
      ${item.disabled_by === "user"
        ? html`<mwc-button unelevated slot="meta" @click=${this._handleEnable}>
            ${this.hass.localize("ui.common.enable")}
          </mwc-button>`
        : configPanel &&
          (item.domain !== "matter" || isDevVersion(this.hass.config.version))
        ? html`<a
            slot="meta"
            href=${`/${configPanel}?config_entry=${item.entry_id}`}
            ><mwc-button>
              ${this.hass.localize(
                "ui.panel.config.integrations.config_entry.configure"
              )}
            </mwc-button></a
          >`
        : item.supports_options && !stateText
        ? html`
            <mwc-button slot="meta" @click=${this._showOptions}>
              ${this.hass.localize(
                "ui.panel.config.integrations.config_entry.configure"
              )}
            </mwc-button>
          `
        : ""}
      <ha-button-menu slot="meta">
        <ha-icon-button
          slot="trigger"
          .label=${this.hass.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>
        ${item.supports_options && stateText
          ? html`<ha-list-item
              @request-selected=${this._showOptions}
              graphic="icon"
            >
              <ha-svg-icon slot="graphic" .path=${mdiCog}></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.config.integrations.config_entry.configure"
              )}
            </ha-list-item>`
          : ""}
        ${item.disabled_by && devices.length
          ? html`<a
              href=${devices.length === 1
                ? `/config/devices/device/${devices[0].id}`
                : `/config/devices/dashboard?historyBack=1&config_entry=${item.entry_id}`}
            >
              <ha-list-item hasMeta graphic="icon">
                <ha-svg-icon .path=${mdiDevices} slot="graphic"></ha-svg-icon>
                ${this.hass.localize(
                  `ui.panel.config.integrations.config_entry.devices`,
                  "count",
                  devices.length
                )}
                <ha-icon-next slot="meta"></ha-icon-next>
              </ha-list-item>
            </a>`
          : ""}
        ${item.disabled_by && services.length
          ? html`<a
              href=${services.length === 1
                ? `/config/devices/device/${services[0].id}`
                : `/config/devices/dashboard?historyBack=1&config_entry=${item.entry_id}`}
            >
              <ha-list-item hasMeta graphic="icon">
                <ha-svg-icon
                  .path=${mdiHandExtendedOutline}
                  slot="graphic"
                ></ha-svg-icon>
                ${this.hass.localize(
                  `ui.panel.config.integrations.config_entry.services`,
                  "count",
                  services.length
                )}
                <ha-icon-next slot="meta"></ha-icon-next>
              </ha-list-item>
            </a>`
          : ""}
        ${item.disabled_by && entities.length
          ? html`<a
              href=${`/config/entities?historyBack=1&config_entry=${item.entry_id}`}
            >
              <ha-list-item hasMeta graphic="icon">
                <ha-svg-icon
                  .path=${mdiShapeOutline}
                  slot="graphic"
                ></ha-svg-icon>
                ${this.hass.localize(
                  `ui.panel.config.integrations.config_entry.entities`,
                  "count",
                  entities.length
                )}
                <ha-icon-next slot="meta"></ha-icon-next>
              </ha-list-item>
            </a>`
          : ""}
        ${!item.disabled_by &&
        RECOVERABLE_STATES.includes(item.state) &&
        item.supports_unload &&
        item.source !== "system"
          ? html`<ha-list-item
              @request-selected=${this._handleReload}
              graphic="icon"
            >
              ${this.hass.localize(
                "ui.panel.config.integrations.config_entry.reload"
              )}
              <ha-svg-icon slot="graphic" .path=${mdiReload}></ha-svg-icon>
            </ha-list-item>`
          : ""}

        <ha-list-item @request-selected=${this._handleRename} graphic="icon">
          ${this.hass.localize(
            "ui.panel.config.integrations.config_entry.rename"
          )}
          <ha-svg-icon slot="graphic" .path=${mdiRenameBox}></ha-svg-icon>
        </ha-list-item>

        <li divider role="separator"></li>

        ${this._diagnosticHandler && item.state === "loaded"
          ? html`<a
              href=${getConfigEntryDiagnosticsDownloadUrl(item.entry_id)}
              target="_blank"
              @click=${this._signUrl}
            >
              <ha-list-item graphic="icon">
                ${this.hass.localize(
                  "ui.panel.config.integrations.config_entry.download_diagnostics"
                )}
                <ha-svg-icon slot="graphic" .path=${mdiDownload}></ha-svg-icon>
              </ha-list-item>
            </a>`
          : ""}

        <ha-list-item
          @request-selected=${this._handleSystemOptions}
          graphic="icon"
        >
          ${this.hass.localize(
            "ui.panel.config.integrations.config_entry.system_options"
          )}
          <ha-svg-icon slot="graphic" .path=${mdiCog}></ha-svg-icon>
        </ha-list-item>
        ${item.disabled_by === "user"
          ? html`<ha-list-item
              @request-selected=${this._handleEnable}
              graphic="icon"
            >
              ${this.hass.localize("ui.common.enable")}
              <ha-svg-icon
                slot="graphic"
                .path=${mdiPlayCircleOutline}
              ></ha-svg-icon>
            </ha-list-item>`
          : item.source !== "system"
          ? html`<ha-list-item
              class="warning"
              @request-selected=${this._handleDisable}
              graphic="icon"
            >
              ${this.hass.localize("ui.common.disable")}
              <ha-svg-icon
                slot="graphic"
                class="warning"
                .path=${mdiStopCircleOutline}
              ></ha-svg-icon>
            </ha-list-item>`
          : ""}
        ${item.source !== "system"
          ? html`<ha-list-item
              class="warning"
              @request-selected=${this._handleDelete}
              graphic="icon"
            >
              ${this.hass.localize(
                "ui.panel.config.integrations.config_entry.delete"
              )}
              <ha-svg-icon
                slot="graphic"
                class="warning"
                .path=${mdiDelete}
              ></ha-svg-icon>
            </ha-list-item>`
          : ""}
      </ha-button-menu>
    </ha-list-item>`;
  }

  private async _highlightEntry() {
    await nextRender();
    const entryId = this._searchParms.get("config_entry")!;
    const row = this.shadowRoot!.querySelector(
      `[data-entry-id="${entryId}"]`
    ) as any;
    if (row) {
      row.scrollIntoView({
        block: "center",
      });
      row.classList.add("highlight");
    }
  }

  private _continueFlow(ev) {
    showConfigFlowDialog(this, {
      continueFlowId: ev.target.flow.flow_id,
      dialogClosedCallback: () => {
        // this._handleFlowUpdated();
      },
    });
  }

  private async _fetchManifest() {
    if (!this.domain) {
      return;
    }
    this._manifest = await fetchIntegrationManifest(this.hass, this.domain);
    if (
      this._manifest.integration_type &&
      !["device", "hub", "service"].includes(this._manifest.integration_type)
    ) {
      this._extraConfigEntries = await getConfigEntries(this.hass, {
        domain: this.domain,
      });
    }
  }

  private async _fetchDiagnostics() {
    if (!this.domain || !isComponentLoaded(this.hass, "diagnostics")) {
      return;
    }
    try {
      this._diagnosticHandler = await fetchDiagnosticHandler(
        this.hass,
        this.domain
      );
    } catch (err: any) {
      // No issue, as diagnostics are not required
    }
  }

  private async _handleEnableDebugLogging() {
    const integration = this.domain;
    await setIntegrationLogLevel(
      this.hass,
      integration,
      LogSeverity[LogSeverity.DEBUG],
      "once"
    );
  }

  private async _handleDisableDebugLogging(ev: Event) {
    // Stop propagation since otherwise we end up here twice while we await the log level change
    // and trigger two identical debug log downloads.
    ev.stopPropagation();
    const integration = this.domain;
    await setIntegrationLogLevel(
      this.hass,
      integration,
      LogSeverity[LogSeverity.NOTSET],
      "once"
    );
    const timeString = new Date().toISOString().replace(/:/g, "-");
    const logFileName = `home-assistant_${integration}_${timeString}.log`;
    const signedUrl = await getSignedPath(this.hass, getErrorLogDownloadUrl);
    fileDownload(signedUrl.path, logFileName);
  }

  private _getEntities = memoizeOne(
    (
      configEntry: ConfigEntry[],
      entityRegistryEntries: EntityRegistryEntry[]
    ): EntityRegistryEntry[] => {
      if (!entityRegistryEntries) {
        return [];
      }
      const entryIds = configEntry.map((entry) => entry.entry_id);
      return entityRegistryEntries.filter(
        (entity) =>
          entity.config_entry_id && entryIds.includes(entity.config_entry_id)
      );
    }
  );

  private _getDevices = memoizeOne(
    (
      configEntry: ConfigEntry[],
      deviceRegistryEntries: HomeAssistant["devices"]
    ): DeviceRegistryEntry[] => {
      if (!deviceRegistryEntries) {
        return [];
      }
      const entryIds = configEntry.map((entry) => entry.entry_id);
      return Object.values(deviceRegistryEntries).filter((device) =>
        device.config_entries.some((entryId) => entryIds.includes(entryId))
      );
    }
  );

  private _getConfigEntryEntities = (
    configEntry: ConfigEntry
  ): EntityRegistryEntry[] => {
    const entries = this._domainConfigEntries(
      this.domain,
      this._extraConfigEntries || this.configEntries
    );
    const entityRegistryEntries = this._getEntities(entries, this._entities);
    return entityRegistryEntries.filter(
      (entity) => entity.config_entry_id === configEntry.entry_id
    );
  };

  private _getConfigEntryDevices = (
    configEntry: ConfigEntry
  ): DeviceRegistryEntry[] => {
    const entries = this._domainConfigEntries(
      this.domain,
      this._extraConfigEntries || this.configEntries
    );
    const deviceRegistryEntries = this._getDevices(entries, this.hass.devices);
    return Object.values(deviceRegistryEntries).filter(
      (device) =>
        device.config_entries.includes(configEntry.entry_id) &&
        device.entry_type !== "service"
    );
  };

  private _getConfigEntryServices = (
    configEntry: ConfigEntry
  ): DeviceRegistryEntry[] => {
    const entries = this._domainConfigEntries(
      this.domain,
      this._extraConfigEntries || this.configEntries
    );
    const deviceRegistryEntries = this._getDevices(entries, this.hass.devices);
    return Object.values(deviceRegistryEntries).filter(
      (device) =>
        device.config_entries.includes(configEntry.entry_id) &&
        device.entry_type === "service"
    );
  };

  private _showOptions(ev) {
    showOptionsFlowDialog(
      this,
      ev.target.closest(".config_entry").configEntry,
      { manifest: this._manifest }
    );
  }

  private _handleRename(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this._editEntryName(
      ((ev.target as HTMLElement).closest(".config_entry") as any).configEntry
    );
  }

  private _handleReload(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this._reloadIntegration(
      ((ev.target as HTMLElement).closest(".config_entry") as any).configEntry
    );
  }

  private _handleDelete(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this._removeIntegration(
      ((ev.target as HTMLElement).closest(".config_entry") as any).configEntry
    );
  }

  private _handleDisable(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this._disableIntegration(
      ((ev.target as HTMLElement).closest(".config_entry") as any).configEntry
    );
  }

  private _handleEnable(ev: CustomEvent<RequestSelectedDetail>): void {
    if (ev.detail.source && !shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this._enableIntegration(
      ((ev.target as HTMLElement).closest(".config_entry") as any).configEntry
    );
  }

  private _handleSystemOptions(ev: CustomEvent<RequestSelectedDetail>): void {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this._showSystemOptions(
      ((ev.target as HTMLElement).closest(".config_entry") as any).configEntry
    );
  }

  private _showSystemOptions(configEntry: ConfigEntry) {
    showConfigEntrySystemOptionsDialog(this, {
      entry: configEntry,
      manifest: this._manifest,
    });
  }

  private async _disableIntegration(configEntry: ConfigEntry) {
    const entryId = configEntry.entry_id;

    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.integrations.config_entry.disable_confirm_title",
        { title: configEntry.title }
      ),
      text: this.hass.localize(
        "ui.panel.config.integrations.config_entry.disable_confirm_text"
      ),
      confirmText: this.hass!.localize("ui.common.disable"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }
    let result: DisableConfigEntryResult;
    try {
      result = await disableConfigEntry(this.hass, entryId);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.integrations.config_entry.disable_error"
        ),
        text: err.message,
      });
      return;
    }
    if (result.require_restart) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.integrations.config_entry.disable_restart_confirm"
        ),
      });
    }
  }

  private async _enableIntegration(configEntry: ConfigEntry) {
    const entryId = configEntry.entry_id;

    let result: DisableConfigEntryResult;
    try {
      result = await enableConfigEntry(this.hass, entryId);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.integrations.config_entry.disable_error"
        ),
        text: err.message,
      });
      return;
    }

    if (result.require_restart) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.integrations.config_entry.enable_restart_confirm"
        ),
      });
    }
  }

  private async _removeIntegration(configEntry: ConfigEntry) {
    const entryId = configEntry.entry_id;

    const applicationCredentialsId =
      await this._applicationCredentialForRemove(entryId);

    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.integrations.config_entry.delete_confirm_title",
        { title: configEntry.title }
      ),
      text: this.hass.localize(
        "ui.panel.config.integrations.config_entry.delete_confirm_text"
      ),
      confirmText: this.hass!.localize("ui.common.delete"),
      dismissText: this.hass!.localize("ui.common.cancel"),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }
    const result = await deleteConfigEntry(this.hass, entryId);

    if (result.require_restart) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.integrations.config_entry.restart_confirm"
        ),
      });
    }
    if (applicationCredentialsId) {
      this._removeApplicationCredential(applicationCredentialsId);
    }
  }

  // Return an application credentials id for this config entry to prompt the
  // user for removal. This is best effort so we don't stop overall removal
  // if the integration isn't loaded or there is some other error.
  private async _applicationCredentialForRemove(entryId: string) {
    try {
      return (await fetchApplicationCredentialsConfigEntry(this.hass, entryId))
        .application_credentials_id;
    } catch (err: any) {
      // We won't prompt the user to remove credentials
      return null;
    }
  }

  private async _removeApplicationCredential(applicationCredentialsId: string) {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.integrations.config_entry.application_credentials.delete_title"
      ),
      text: html`${this.hass.localize(
          "ui.panel.config.integrations.config_entry.application_credentials.delete_prompt"
        )},
        <br />
        <br />
        ${this.hass.localize(
          "ui.panel.config.integrations.config_entry.application_credentials.delete_detail"
        )}
        <br />
        <br />
        <a
          href=${documentationUrl(
            this.hass,
            "/integrations/application_credentials/"
          )}
          target="_blank"
          rel="noreferrer"
        >
          ${this.hass.localize(
            "ui.panel.config.integrations.config_entry.application_credentials.learn_more"
          )}
        </a>`,
      destructive: true,
      confirmText: this.hass.localize("ui.common.remove"),
      dismissText: this.hass.localize(
        "ui.panel.config.integrations.config_entry.application_credentials.dismiss"
      ),
    });
    if (!confirmed) {
      return;
    }
    try {
      await deleteApplicationCredential(this.hass, applicationCredentialsId);
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.integrations.config_entry.application_credentials.delete_error_title"
        ),
        text: err.message,
      });
    }
  }

  private async _reloadIntegration(configEntry: ConfigEntry) {
    const entryId = configEntry.entry_id;

    const result = await reloadConfigEntry(this.hass, entryId);
    const locale_key = result.require_restart
      ? "reload_restart_confirm"
      : "reload_confirm";
    showAlertDialog(this, {
      text: this.hass.localize(
        `ui.panel.config.integrations.config_entry.${locale_key}`
      ),
    });
  }

  private async _editEntryName(configEntry: ConfigEntry) {
    const newName = await showPromptDialog(this, {
      title: this.hass.localize("ui.panel.config.integrations.rename_dialog"),
      defaultValue: configEntry.title,
      inputLabel: this.hass.localize(
        "ui.panel.config.integrations.rename_input_label"
      ),
    });
    if (newName === null) {
      return;
    }
    await updateConfigEntry(this.hass, configEntry.entry_id, {
      title: newName,
    });
  }

  private async _signUrl(ev) {
    const anchor = ev.target.closest("a");
    ev.preventDefault();
    const signedUrl = await getSignedPath(
      this.hass,
      anchor.getAttribute("href")
    );
    fileDownload(signedUrl.path);
  }

  private async _addIntegration() {
    showAddIntegrationDialog(this, {
      domain: this.domain,
    });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .container {
          display: flex;
          flex-wrap: wrap;
          margin: auto;
          max-width: 1000px;
          margin-top: 32px;
          margin-bottom: 32px;
        }
        .column {
          width: 33%;
          flex-grow: 1;
        }
        .column.small {
          max-width: 300px;
        }
        .column,
        .fullwidth {
          padding: 8px;
          box-sizing: border-box;
        }
        .column > *:not(:first-child) {
          margin-top: 16px;
        }

        :host([narrow]) .column {
          width: 100%;
          max-width: unset;
        }

        :host([narrow]) .container {
          margin-top: 0;
        }
        .card-header {
          padding-bottom: 0;
        }
        .no-entries {
          padding-top: 12px;
        }
        .logo-container {
          display: flex;
          justify-content: center;
        }
        .overview .card-actions {
          padding: 0;
        }
        img {
          max-width: 200px;
          max-height: 100px;
        }
        ha-alert {
          display: block;
          margin-top: 4px;
        }
        ha-alert:first-of-type {
          margin-top: 16px;
        }
        ha-list-item.discovered {
          --mdc-list-item-meta-size: auto;
          --mdc-list-item-meta-display: flex;
          height: 72px;
        }
        ha-list-item.config_entry {
          overflow: visible;
          --mdc-list-item-meta-size: auto;
          --mdc-list-item-meta-display: flex;
        }
        ha-button-menu ha-list-item {
          --mdc-list-item-meta-size: 24px;
        }
        ha-list-item.config_entry::after {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          opacity: 0.12;
          pointer-events: none;
          content: "";
        }
        ha-button-menu {
          flex: 0;
        }
        a {
          text-decoration: none;
        }
        .highlight::after {
          background-color: var(--info-color);
        }
        .attention {
          primary-color: var(--error-color);
        }
        .warning {
          color: var(--error-color);
        }
        .state-error {
          --state-message-color: var(--error-color);
          --text-on-state-color: var(--text-primary-color);
        }
        .state-error::after {
          background-color: var(--error-color);
        }
        .state-failed-unload {
          --state-message-color: var(--warning-color);
          --text-on-state-color: var(--primary-text-color);
        }
        .state-failed::after {
          background-color: var(--warning-color);
        }
        .state-not-loaded {
          --state-message-color: var(--primary-text-color);
        }
        .state-setup {
          --state-message-color: var(--secondary-text-color);
        }
        .message {
          font-weight: bold;
          display: flex;
          align-items: center;
        }
        .message ha-svg-icon {
          color: var(--state-message-color);
        }
        .message div {
          flex: 1;
          margin-left: 8px;
          padding-top: 2px;
          padding-right: 2px;
          overflow-wrap: break-word;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 7;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-integration-page": HaConfigIntegrationPage;
  }
}
