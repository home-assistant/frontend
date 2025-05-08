import {
  mdiAlertCircle,
  mdiBookshelf,
  mdiBug,
  mdiBugPlay,
  mdiBugStop,
  mdiCog,
  mdiDelete,
  mdiDevices,
  mdiDotsVertical,
  mdiDownload,
  mdiFileCodeOutline,
  mdiHandExtendedOutline,
  mdiOpenInNew,
  mdiPackageVariant,
  mdiPlayCircleOutline,
  mdiPlus,
  mdiProgressHelper,
  mdiReload,
  mdiReloadAlert,
  mdiRenameBox,
  mdiShapeOutline,
  mdiStopCircleOutline,
  mdiWeb,
  mdiWrench,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { until } from "lit/directives/until";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { isDevVersion } from "../../../common/config/version";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import { nextRender } from "../../../common/util/render-status";
import "../../../components/ha-button";
import "../../../components/ha-card";
import "../../../components/ha-md-divider";
import "../../../components/ha-list-item";
import "../../../components/ha-md-button-menu";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import "../../../components/ha-md-menu-item";
import {
  deleteApplicationCredential,
  fetchApplicationCredentialsConfigEntry,
} from "../../../data/application_credential";
import { getSignedPath } from "../../../data/auth";
import type {
  ConfigEntry,
  DisableConfigEntryResult,
  SubEntry,
} from "../../../data/config_entries";
import {
  ERROR_STATES,
  RECOVERABLE_STATES,
  deleteConfigEntry,
  deleteSubEntry,
  disableConfigEntry,
  enableConfigEntry,
  getConfigEntries,
  getSubEntries,
  reloadConfigEntry,
  updateConfigEntry,
} from "../../../data/config_entries";
import { ATTENTION_SOURCES } from "../../../data/config_flow";
import type { DeviceRegistryEntry } from "../../../data/device_registry";
import type { DiagnosticInfo } from "../../../data/diagnostics";
import {
  fetchDiagnosticHandler,
  getConfigEntryDiagnosticsDownloadUrl,
} from "../../../data/diagnostics";
import type { EntityRegistryEntry } from "../../../data/entity_registry";
import { subscribeEntityRegistry } from "../../../data/entity_registry";
import { fetchEntitySourcesWithCache } from "../../../data/entity_sources";
import { getErrorLogDownloadUrl } from "../../../data/error_log";
import type {
  IntegrationLogInfo,
  IntegrationManifest,
} from "../../../data/integration";
import {
  LogSeverity,
  domainToName,
  fetchIntegrationManifest,
  integrationIssuesUrl,
  integrationsWithPanel,
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
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { documentationUrl } from "../../../util/documentation-url";
import { fileDownload } from "../../../util/file_download";
import type { DataEntryFlowProgressExtended } from "./ha-config-integrations";
import { showAddIntegrationDialog } from "./show-add-integration-dialog";
import { QUALITY_SCALE_MAP } from "../../../data/integration_quality_scale";
import { showSubConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-sub-config-flow";

export const renderConfigEntryError = (
  hass: HomeAssistant,
  entry: ConfigEntry
): TemplateResult => {
  if (entry.reason) {
    if (entry.error_reason_translation_key) {
      const lokalisePromExc = hass
        .loadBackendTranslation("exceptions", entry.domain)
        .then(
          (localize) =>
            localize(
              `component.${entry.domain}.exceptions.${entry.error_reason_translation_key}.message`,
              entry.error_reason_translation_placeholders ?? undefined
            ) || entry.reason
        );
      return html`${until(lokalisePromExc)}`;
    }
    const lokalisePromError = hass
      .loadBackendTranslation("config", entry.domain)
      .then(
        (localize) =>
          localize(`component.${entry.domain}.config.error.${entry.reason}`) ||
          entry.reason
      );
    return html`${until(lokalisePromError, entry.reason)}`;
  }
  return html`
    <br />
    ${hass.localize("ui.panel.config.integrations.config_entry.check_the_logs")}
  `;
};

@customElement("ha-config-integration-page")
class HaConfigIntegrationPage extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public domain!: string;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public showAdvanced = false;

  @property({ attribute: false }) public configEntries?: ConfigEntry[];

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

  @state() private _domainEntities: Record<string, string[]> = {};

  @state() private _subEntries: Record<string, SubEntry[]> = {};

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
      this.hass.loadBackendTranslation("config_subentries", [this.domain]);
      this._extraConfigEntries = undefined;
      this._fetchManifest();
      this._fetchDiagnostics();
      this._fetchEntitySources();
    }
    if (
      changedProperties.has("configEntries") ||
      changedProperties.has("_extraConfigEntries")
    ) {
      this._fetchSubEntries();
    }
  }

  private async _fetchEntitySources() {
    const entitySources = await fetchEntitySourcesWithCache(this.hass);

    const entitiesByDomain = {};

    for (const [entity, source] of Object.entries(entitySources)) {
      if (!(source.domain in entitiesByDomain)) {
        entitiesByDomain[source.domain] = [];
      }
      entitiesByDomain[source.domain].push(entity);
    }

    this._domainEntities = entitiesByDomain;
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
    let numberOfEntities = entities.length;

    if (
      this.domain in this._domainEntities &&
      numberOfEntities !== this._domainEntities[this.domain].length
    ) {
      if (!numberOfEntities) {
        numberOfEntities = this._domainEntities[this.domain].length;
      } else {
        const entityIds = new Set(entities.map((entity) => entity.entity_id));
        for (const entityId of this._domainEntities[this.domain]) {
          entityIds.add(entityId);
        }
        numberOfEntities = entityIds.size;
      }
    }

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
                ${this._manifest?.version != null
                  ? html`<div class="version">${this._manifest.version}</div>`
                  : nothing}
                ${this._manifest?.is_built_in === false
                  ? html`<div
                      class=${`integration-info ${
                        this._manifest.overwrites_built_in ? "error" : "warn"
                      }`}
                    >
                      <ha-svg-icon path=${mdiPackageVariant}></ha-svg-icon>
                      <a
                        href=${documentationUrl(
                          this.hass,
                          `/docs/quality_scale/#-custom`
                        )}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        ${this.hass.localize(
                          this._manifest.overwrites_built_in
                            ? "ui.panel.config.integrations.config_entry.custom_overwrites_core"
                            : "ui.panel.config.integrations.config_entry.custom_integration"
                        )}
                      </a>
                    </div>`
                  : nothing}
                ${this._manifest?.iot_class?.startsWith("cloud_")
                  ? html`<div class="integration-info">
                      <ha-svg-icon .path=${mdiWeb}></ha-svg-icon>
                      ${this.hass.localize(
                        "ui.panel.config.integrations.config_entry.depends_on_cloud"
                      )}
                    </div>`
                  : nothing}
                ${normalEntries.length === 0 &&
                this._manifest &&
                !this._manifest.config_flow &&
                this.hass.config.components.find(
                  (comp) => comp.split(".")[0] === this.domain
                )
                  ? html`<div class="integration-info info">
                      <ha-svg-icon path=${mdiFileCodeOutline}></ha-svg-icon
                      >${this.hass.localize(
                        "ui.panel.config.integrations.config_entry.no_config_flow"
                      )}
                    </div>`
                  : nothing}
              </div>

              <div class="card-actions">
                ${this._manifest?.is_built_in &&
                this._manifest.quality_scale &&
                Object.keys(QUALITY_SCALE_MAP).includes(
                  this._manifest.quality_scale
                )
                  ? html`
                      <a
                        href=${documentationUrl(
                          this.hass,
                          `/docs/quality_scale/#-${this._manifest.quality_scale}`
                        )}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        <ha-list-item hasMeta graphic="icon">
                          <ha-svg-icon
                            slot="graphic"
                            class=${`quality-scale ${this._manifest.quality_scale}-quality`}
                            .path=${QUALITY_SCALE_MAP[
                              this._manifest.quality_scale
                            ].icon}
                          ></ha-svg-icon>
                          ${this.hass.localize(
                            QUALITY_SCALE_MAP[this._manifest.quality_scale]
                              .translationKey
                          )}
                          <ha-svg-icon
                            slot="meta"
                            .path=${mdiOpenInNew}
                          ></ha-svg-icon>
                        </ha-list-item>
                      </a>
                    `
                  : nothing}
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
                          { count: devices.length }
                        )}
                        <ha-icon-next slot="meta"></ha-icon-next>
                      </ha-list-item>
                    </a>`
                  : nothing}
                ${numberOfEntities > 0
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
                          { count: numberOfEntities }
                        )}
                        <ha-icon-next slot="meta"></ha-icon-next>
                      </ha-list-item>
                    </a>`
                  : nothing}
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
                  : nothing}
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
                  : nothing}
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
                  : nothing}
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
                  <ha-md-list>
                    ${discoveryFlows.map(
                      (flow) =>
                        html`<ha-md-list-item class="discovered">
                          ${flow.localized_title}
                          <ha-button
                            slot="end"
                            unelevated
                            .flow=${flow}
                            @click=${this._continueFlow}
                            .label=${this.hass.localize("ui.common.add")}
                          ></ha-button>
                        </ha-md-list-item>`
                    )}
                  </ha-md-list>
                </ha-card>`
              : nothing}
            ${attentionFlows.length || attentionEntries.length
              ? html`<ha-card>
                  <h1 class="card-header">
                    ${this.hass.localize(
                      `ui.panel.config.integrations.integration_page.attention_entries`
                    )}
                  </h1>
                  <ha-md-list>
                    ${attentionFlows.map((flow) => {
                      const attention = ATTENTION_SOURCES.includes(
                        flow.context.source
                      );
                      return html`<ha-md-list-item
                        class="config_entry ${attention ? "attention" : ""}"
                      >
                        ${flow.localized_title}
                        <span slot="supporting-text"
                          >${this.hass.localize(
                            `ui.panel.config.integrations.${
                              attention ? "attention" : "discovered"
                            }`
                          )}</span
                        >
                        <ha-button
                          slot="end"
                          unelevated
                          .flow=${flow}
                          @click=${this._continueFlow}
                          .label=${this.hass.localize(
                            `ui.panel.config.integrations.${
                              attention ? "reconfigure" : "configure"
                            }`
                          )}
                        ></ha-button>
                      </ha-md-list-item>`;
                    })}
                    ${attentionEntries.map(
                      (item, index) =>
                        html`${this._renderConfigEntry(item)}
                        ${index < attentionEntries.length - 1
                          ? html` <ha-md-divider
                              role="separator"
                              tabindex="-1"
                            ></ha-md-divider>`
                          : nothing} `
                    )}
                  </ha-md-list>
                </ha-card>`
              : nothing}

            <ha-card>
              <h1 class="card-header">
                ${this._manifest?.integration_type
                  ? this.hass.localize(
                      `ui.panel.config.integrations.integration_page.entries_${this._manifest.integration_type}`
                    )
                  : this.hass.localize(
                      `ui.panel.config.integrations.integration_page.entries`
                    )}
              </h1>
              ${normalEntries.length === 0
                ? html`<div class="card-content no-entries">
                    ${this._manifest &&
                    !this._manifest.config_flow &&
                    this.hass.config.components.find(
                      (comp) => comp.split(".")[0] === this.domain
                    )
                      ? this.hass.localize(
                          "ui.panel.config.integrations.integration_page.yaml_entry"
                        )
                      : this.hass.localize(
                          "ui.panel.config.integrations.integration_page.no_entries"
                        )}
                  </div>`
                : html`<ha-md-list>
                    ${normalEntries.map(
                      (item, index) =>
                        html`${this._renderConfigEntry(item)}
                        ${index < normalEntries.length - 1
                          ? html` <ha-md-divider
                              role="separator"
                              tabindex="-1"
                            ></ha-md-divider>`
                          : nothing}`
                    )}
                  </ha-md-list>`}
              <div class="card-actions">
                <ha-button @click=${this._addIntegration}>
                  ${this._manifest?.integration_type
                    ? this.hass.localize(
                        `ui.panel.config.integrations.integration_page.add_${this._manifest.integration_type}`
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

  private _renderDeviceLine(
    item: ConfigEntry,
    devices: DeviceRegistryEntry[],
    services: DeviceRegistryEntry[],
    entities: EntityRegistryEntry[],
    subItem?: SubEntry
  ) {
    let devicesLine: (TemplateResult | string)[] = [];
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
          : `/config/devices/dashboard?historyBack=1&config_entry=${item.entry_id}${subItem ? `&sub_entry=${subItem.subentry_id}` : ""}`;
      devicesLine.push(
        // no white space before/after template on purpose
        html`<a href=${url}
          >${this.hass.localize(
            `ui.panel.config.integrations.config_entry.${localizeKey}`,
            { count: items.length }
          )}</a
        >`
      );
    }

    if (entities.length) {
      devicesLine.push(
        // no white space before/after template on purpose
        html`<a
          href=${`/config/entities?historyBack=1&config_entry=${item.entry_id}${subItem ? `&sub_entry=${subItem.subentry_id}` : ""}`}
          >${this.hass.localize(
            "ui.panel.config.integrations.config_entry.entities",
            { count: entities.length }
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
    return devicesLine;
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
      stateTextExtra = renderConfigEntryError(this.hass, item);
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
      devicesLine = this._renderDeviceLine(item, devices, services, entities);
    }

    const configPanel = this._configPanel(item.domain, this.hass.panels);

    const subEntries = this._subEntries[item.entry_id] || [];

    return html`<ha-md-list-item
        class=${classMap({
          config_entry: true,
          "state-not-loaded": item!.state === "not_loaded",
          "state-failed-unload": item!.state === "failed_unload",
          "state-setup": item!.state === "setup_in_progress",
          "state-error": ERROR_STATES.includes(item!.state),
          "state-disabled": item.disabled_by !== null,
        })}
        data-entry-id=${item.entry_id}
        .configEntry=${item}
      >
        <div slot="headline">
          ${item.title || domainToName(this.hass.localize, item.domain)}
        </div>
        <div slot="supporting-text">
          <div>${devicesLine}</div>
          ${stateText
            ? html`
                <div class="message">
                  <ha-svg-icon .path=${icon}></ha-svg-icon>
                  <div>
                    ${this.hass.localize(...stateText)}${stateTextExtra
                      ? html`: ${stateTextExtra}`
                      : nothing}
                  </div>
                </div>
              `
            : nothing}
        </div>
        ${item.disabled_by === "user"
          ? html`<ha-button unelevated slot="end" @click=${this._handleEnable}>
              ${this.hass.localize("ui.common.enable")}
            </ha-button>`
          : configPanel &&
              (item.domain !== "matter" ||
                isDevVersion(this.hass.config.version)) &&
              !stateText
            ? html`<a
                slot="end"
                href=${`/${configPanel}?config_entry=${item.entry_id}`}
                ><ha-button>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.configure"
                  )}
                </ha-button></a
              >`
            : item.supports_options
              ? html`
                  <ha-button slot="end" @click=${this._showOptions}>
                    ${this.hass.localize(
                      "ui.panel.config.integrations.config_entry.configure"
                    )}
                  </ha-button>
                `
              : nothing}
        <ha-md-button-menu positioning="popover" slot="end">
          <ha-icon-button
            slot="trigger"
            .label=${this.hass.localize("ui.common.menu")}
            .path=${mdiDotsVertical}
          ></ha-icon-button>
          ${item.disabled_by && devices.length
            ? html`
                <ha-md-menu-item
                  href=${devices.length === 1
                    ? `/config/devices/device/${devices[0].id}`
                    : `/config/devices/dashboard?historyBack=1&config_entry=${item.entry_id}`}
                >
                  <ha-svg-icon .path=${mdiDevices} slot="start"></ha-svg-icon>
                  ${this.hass.localize(
                    `ui.panel.config.integrations.config_entry.devices`,
                    { count: devices.length }
                  )}
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-menu-item>
              `
            : nothing}
          ${item.disabled_by && services.length
            ? html`<ha-md-menu-item
                href=${services.length === 1
                  ? `/config/devices/device/${services[0].id}`
                  : `/config/devices/dashboard?historyBack=1&config_entry=${item.entry_id}`}
              >
                <ha-svg-icon
                  .path=${mdiHandExtendedOutline}
                  slot="start"
                ></ha-svg-icon>
                ${this.hass.localize(
                  `ui.panel.config.integrations.config_entry.services`,
                  { count: services.length }
                )}
                <ha-icon-next slot="end"></ha-icon-next>
              </ha-md-menu-item> `
            : nothing}
          ${item.disabled_by && entities.length
            ? html`
                <ha-md-menu-item
                  href=${`/config/entities?historyBack=1&config_entry=${item.entry_id}`}
                >
                  <ha-svg-icon
                    .path=${mdiShapeOutline}
                    slot="start"
                  ></ha-svg-icon>
                  ${this.hass.localize(
                    `ui.panel.config.integrations.config_entry.entities`,
                    { count: entities.length }
                  )}
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-menu-item>
              `
            : nothing}
          ${!item.disabled_by &&
          RECOVERABLE_STATES.includes(item.state) &&
          item.supports_unload &&
          item.source !== "system"
            ? html`
                <ha-md-menu-item @click=${this._handleReload}>
                  <ha-svg-icon slot="start" .path=${mdiReload}></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.reload"
                  )}
                </ha-md-menu-item>
              `
            : nothing}

          <ha-md-menu-item @click=${this._handleRename} graphic="icon">
            <ha-svg-icon slot="start" .path=${mdiRenameBox}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.integrations.config_entry.rename"
            )}
          </ha-md-menu-item>

          ${Object.keys(item.supported_subentry_types).map(
            (flowType) =>
              html`<ha-md-menu-item
                @click=${this._addSubEntry}
                .entry=${item}
                .flowType=${flowType}
                graphic="icon"
              >
                <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
                ${this.hass.localize(
                  `component.${item.domain}.config_subentries.${flowType}.initiate_flow.user`
                )}</ha-md-menu-item
              >`
          )}

          <ha-md-divider role="separator" tabindex="-1"></ha-md-divider>

          ${this._diagnosticHandler && item.state === "loaded"
            ? html`
                <ha-md-menu-item
                  href=${getConfigEntryDiagnosticsDownloadUrl(item.entry_id)}
                  target="_blank"
                  @click=${this._signUrl}
                >
                  <ha-svg-icon slot="start" .path=${mdiDownload}></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.download_diagnostics"
                  )}
                </ha-md-menu-item>
              `
            : nothing}
          ${!item.disabled_by &&
          item.supports_reconfigure &&
          item.source !== "system"
            ? html`
                <ha-md-menu-item @click=${this._handleReconfigure}>
                  <ha-svg-icon slot="start" .path=${mdiWrench}></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.reconfigure"
                  )}
                </ha-md-menu-item>
              `
            : nothing}

          <ha-md-menu-item @click=${this._handleSystemOptions} graphic="icon">
            <ha-svg-icon slot="start" .path=${mdiCog}></ha-svg-icon>
            ${this.hass.localize(
              "ui.panel.config.integrations.config_entry.system_options"
            )}
          </ha-md-menu-item>
          ${item.disabled_by === "user"
            ? html`
                <ha-md-menu-item @click=${this._handleEnable}>
                  <ha-svg-icon
                    slot="start"
                    .path=${mdiPlayCircleOutline}
                  ></ha-svg-icon>
                  ${this.hass.localize("ui.common.enable")}
                </ha-md-menu-item>
              `
            : item.source !== "system"
              ? html`
                  <ha-md-menu-item
                    class="warning"
                    @click=${this._handleDisable}
                    graphic="icon"
                  >
                    <ha-svg-icon
                      slot="start"
                      class="warning"
                      .path=${mdiStopCircleOutline}
                    ></ha-svg-icon>
                    ${this.hass.localize("ui.common.disable")}
                  </ha-md-menu-item>
                `
              : nothing}
          ${item.source !== "system"
            ? html`
                <ha-md-menu-item class="warning" @click=${this._handleDelete}>
                  <ha-svg-icon
                    slot="start"
                    class="warning"
                    .path=${mdiDelete}
                  ></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.delete"
                  )}
                </ha-md-menu-item>
              `
            : nothing}
        </ha-md-button-menu>
      </ha-md-list-item>
      ${subEntries.map((subEntry) => this._renderSubEntry(item, subEntry))}`;
  }

  private _renderSubEntry(configEntry: ConfigEntry, subEntry: SubEntry) {
    const devices = this._getConfigEntryDevices(configEntry).filter((device) =>
      device.config_entries_subentries[configEntry.entry_id]?.includes(
        subEntry.subentry_id
      )
    );
    const services = this._getConfigEntryServices(configEntry).filter(
      (device) =>
        device.config_entries_subentries[configEntry.entry_id]?.includes(
          subEntry.subentry_id
        )
    );
    const entities = this._getConfigEntryEntities(configEntry).filter(
      (entity) => entity.config_subentry_id === subEntry.subentry_id
    );

    return html`<ha-md-list-item
      class="sub-entry"
      data-entry-id=${configEntry.entry_id}
      .configEntry=${configEntry}
      .subEntry=${subEntry}
    >
      <span slot="headline">${subEntry.title}</span>
      <span slot="supporting-text"
        >${this.hass.localize(
          `component.${configEntry.domain}.config_subentries.${subEntry.subentry_type}.entry_type`
        )}
        -
        ${this._renderDeviceLine(
          configEntry,
          devices,
          services,
          entities,
          subEntry
        )}</span
      >
      ${configEntry.supported_subentry_types[subEntry.subentry_type]
        ?.supports_reconfigure
        ? html`
            <ha-button slot="end" @click=${this._handleReconfigureSub}>
              ${this.hass.localize(
                "ui.panel.config.integrations.config_entry.configure"
              )}
            </ha-button>
          `
        : nothing}
      <ha-md-button-menu positioning="popover" slot="end">
        <ha-icon-button
          slot="trigger"
          .label=${this.hass.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>
        <ha-md-menu-item class="warning" @click=${this._handleDeleteSub}>
          <ha-svg-icon
            slot="start"
            class="warning"
            .path=${mdiDelete}
          ></ha-svg-icon>
          ${this.hass.localize(
            "ui.panel.config.integrations.config_entry.delete"
          )}
        </ha-md-menu-item>
      </ha-md-button-menu>
    </ha-md-list-item>`;
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
      navigateToResult: true,
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

  private async _fetchSubEntries() {
    const subEntriesPromises = (
      this._extraConfigEntries || this.configEntries
    )?.map((entry) =>
      entry.num_subentries
        ? getSubEntries(this.hass, entry.entry_id).then((subEntries) => ({
            entry_id: entry.entry_id,
            subEntries,
          }))
        : undefined
    );
    if (subEntriesPromises) {
      const subEntries = await Promise.all(subEntriesPromises);
      this._subEntries = {};
      subEntries.forEach((entry) => {
        if (!entry) return;
        this._subEntries[entry.entry_id] = entry.subEntries;
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
    } catch (_err: any) {
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

  private _handleRename(ev: Event): void {
    this._editEntryName(
      ((ev.target as HTMLElement).closest(".config_entry") as any).configEntry
    );
  }

  private _handleReload(ev: Event): void {
    this._reloadIntegration(
      ((ev.target as HTMLElement).closest(".config_entry") as any).configEntry
    );
  }

  private _handleReconfigure(ev: Event): void {
    this._reconfigureIntegration(
      ((ev.target as HTMLElement).closest(".config_entry") as any).configEntry
    );
  }

  private _handleDelete(ev: Event): void {
    this._removeIntegration(
      ((ev.target as HTMLElement).closest(".config_entry") as any).configEntry
    );
  }

  private async _handleReconfigureSub(ev: Event): Promise<void> {
    const configEntry = (
      (ev.target as HTMLElement).closest(".sub-entry") as any
    ).configEntry;
    const subEntry = ((ev.target as HTMLElement).closest(".sub-entry") as any)
      .subEntry;

    showSubConfigFlowDialog(
      this,
      configEntry,
      subEntry.flowType || subEntry.subentry_type,
      {
        startFlowHandler: configEntry.entry_id,
        subEntryId: subEntry.subentry_id,
      }
    );
  }

  private async _handleDeleteSub(ev: Event): Promise<void> {
    const configEntry = (
      (ev.target as HTMLElement).closest(".sub-entry") as any
    ).configEntry;
    const subEntry = ((ev.target as HTMLElement).closest(".sub-entry") as any)
      .subEntry;
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.integrations.config_entry.delete_confirm_title",
        { title: subEntry.title }
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
    await deleteSubEntry(this.hass, configEntry.entry_id, subEntry.subentry_id);
  }

  private _handleDisable(ev: Event): void {
    this._disableIntegration(
      ((ev.target as HTMLElement).closest(".config_entry") as any).configEntry
    );
  }

  private _handleEnable(ev: Event): void {
    this._enableIntegration(
      ((ev.target as HTMLElement).closest(".config_entry") as any).configEntry
    );
  }

  private _handleSystemOptions(ev: Event): void {
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
    } catch (_err: any) {
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

  private async _reconfigureIntegration(configEntry: ConfigEntry) {
    showConfigFlowDialog(this, {
      startFlowHandler: configEntry.domain,
      showAdvanced: this.hass.userData?.showAdvanced,
      manifest: await fetchIntegrationManifest(this.hass, configEntry.domain),
      entryId: configEntry.entry_id,
      navigateToResult: true,
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
    const anchor = ev.currentTarget;
    ev.preventDefault();
    const signedUrl = await getSignedPath(
      this.hass,
      anchor.getAttribute("href")
    );
    fileDownload(signedUrl.path);
  }

  private async _addIntegration() {
    if (!this._manifest?.config_flow) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.integrations.config_flow.yaml_only_title"
        ),
        text: this.hass.localize(
          "ui.panel.config.integrations.config_flow.yaml_only"
        ),
      });
      return;
    }
    if (this._manifest?.single_config_entry) {
      const entries = this._domainConfigEntries(
        this.domain,
        this._extraConfigEntries || this.configEntries
      );
      if (entries.length > 0) {
        const localize = await this.hass.loadBackendTranslation(
          "title",
          this._manifest.name
        );
        await showAlertDialog(this, {
          title: this.hass.localize(
            "ui.panel.config.integrations.config_flow.single_config_entry_title"
          ),
          text: this.hass.localize(
            "ui.panel.config.integrations.config_flow.single_config_entry",
            {
              integration_name: domainToName(localize, this._manifest.name),
            }
          ),
        });
        return;
      }
    }
    showAddIntegrationDialog(this, {
      domain: this.domain,
    });
  }

  private async _addSubEntry(ev) {
    showSubConfigFlowDialog(this, ev.target.entry, ev.target.flowType, {
      startFlowHandler: ev.target.entry.entry_id,
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
        .card-content {
          padding: 16px 0 8px;
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
          padding: 12px 16px;
        }
        .logo-container {
          display: flex;
          justify-content: center;
          margin-bottom: 8px;
        }
        .version {
          padding-top: 8px;
          display: flex;
          justify-content: center;
          color: var(--secondary-text-color);
        }
        .overview .card-actions {
          padding: 0;
        }
        img {
          max-width: 200px;
          max-height: 100px;
        }

        @keyframes shimmer {
          100% {
            mask-position: left;
          }
        }
        .integration-info {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 0 20px;
          min-height: 48px;
        }
        .integration-info ha-svg-icon {
          min-width: 24px;
          color: var(--mdc-theme-text-icon-on-background);
        }
        .integration-info.warn ha-svg-icon {
          color: var(--warning-color);
        }
        .integration-info.error ha-svg-icon {
          color: var(--error-color);
        }
        .integration-info.info ha-svg-icon {
          color: var(--info-color);
        }
        .quality-scale {
          mask: linear-gradient(-60deg, #000 30%, #0005, #000 70%) right/350%
            100%;
          animation: shimmer 2.5s infinite;
        }
        ha-svg-icon.bronze-quality {
          color: #cd7f32;
        }
        ha-svg-icon.silver-quality {
          color: silver;
        }
        ha-svg-icon.gold-quality {
          color: gold;
        }
        ha-svg-icon.platinum-quality {
          color: #727272;
        }
        ha-svg-icon.internal-quality {
          color: var(--primary-color);
        }
        ha-svg-icon.legacy-quality {
          color: var(--mdc-theme-text-icon-on-background, rgba(0, 0, 0, 0.38));
          animation: unset;
        }
        ha-md-list-item {
          position: relative;
        }
        ha-md-list-item.discovered {
          height: 72px;
        }
        ha-md-list-item.config_entry::after {
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          opacity: 0.12;
          pointer-events: none;
          content: "";
        }
        ha-md-list-item.sub-entry {
          --md-list-item-leading-space: 50px;
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
          font-weight: var(--ha-font-weight-bold);
          display: flex;
          align-items: center;
        }
        .message ha-svg-icon {
          color: var(--state-message-color);
        }
        .message div {
          flex: 1;
          margin-left: 8px;
          margin-inline-start: 8px;
          margin-inline-end: initial;
          padding-top: 2px;
          padding-right: 2px;
          padding-inline-end: 2px;
          padding-inline-start: initial;
          overflow-wrap: break-word;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 7;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .state-disabled [slot="headline"],
        .state-disabled [slot="supporting-text"] {
          opacity: var(--md-list-item-disabled-opacity, 0.3);
        }
        ha-md-list {
          margin-top: 8px;
          margin-bottom: 8px;
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
