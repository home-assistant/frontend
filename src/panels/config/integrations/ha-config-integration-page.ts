import {
  mdiBug,
  mdiBugPlay,
  mdiBugStop,
  mdiDotsVertical,
  mdiFileCodeOutline,
  mdiHelpCircleOutline,
  mdiOpenInNew,
  mdiPackageVariant,
  mdiPlus,
  mdiWeb,
} from "@mdi/js";
import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { until } from "lit/directives/until";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import {
  PROTOCOL_INTEGRATIONS,
  protocolIntegrationPicked,
} from "../../../common/integrations/protocolIntegrationPicked";
import { caseInsensitiveStringCompare } from "../../../common/string/compare";
import { nextRender } from "../../../common/util/render-status";
import "../../../components/ha-button";
import "../../../components/ha-md-button-menu";
import "../../../components/ha-md-divider";
import "../../../components/ha-md-list";
import "../../../components/ha-md-list-item";
import "../../../components/ha-md-menu-item";
import { getSignedPath } from "../../../data/auth";
import type { ConfigEntry } from "../../../data/config_entries";
import { ERROR_STATES, getConfigEntries } from "../../../data/config_entries";
import { ATTENTION_SOURCES } from "../../../data/config_flow";
import type { DeviceRegistryEntry } from "../../../data/device_registry";
import type { DiagnosticInfo } from "../../../data/diagnostics";
import { fetchDiagnosticHandler } from "../../../data/diagnostics";
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
  setIntegrationLogLevel,
  subscribeLogInfo,
} from "../../../data/integration";
import { QUALITY_SCALE_MAP } from "../../../data/integration_quality_scale";
import { showConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-config-flow";
import { showSubConfigFlowDialog } from "../../../dialogs/config-flow/show-dialog-sub-config-flow";
import { showAlertDialog } from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-subpage";
import { SubscribeMixin } from "../../../mixins/subscribe-mixin";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { documentationUrl } from "../../../util/documentation-url";
import { fileDownload } from "../../../util/file_download";
import "./ha-config-entry-row";
import type { DataEntryFlowProgressExtended } from "./ha-config-integrations";
import { showAddIntegrationDialog } from "./show-add-integration-dialog";
import { showPickConfigEntryDialog } from "./show-pick-config-entry-dialog";

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

    const supportedSubentryTypes = new Set<string>();

    configEntries.forEach((entry) => {
      Object.keys(entry.supported_subentry_types).forEach((type) => {
        supportedSubentryTypes.add(type);
      });
    });

    const configEntriesInProgress = this._domainConfigEntriesInProgress(
      this.domain,
      this.configEntriesInProgress
    );

    const discoveryFlows = configEntriesInProgress
      .filter((flow) => !ATTENTION_SOURCES.includes(flow.context.source))
      .sort((a, b) =>
        caseInsensitiveStringCompare(
          a.localized_title || "zzz",
          b.localized_title || "zzz",
          this.hass.locale.language
        )
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

    const devicesRegs = this._getDevices(configEntries, this.hass.devices);
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

    const services = devicesRegs.filter(
      (device) => device.entry_type === "service"
    );
    const devices = devicesRegs.filter(
      (device) => device.entry_type !== "service"
    );

    const canAddDevice = (PROTOCOL_INTEGRATIONS as readonly string[]).includes(
      this.domain
    );

    return html`
      <hass-subpage .hass=${this.hass} .narrow=${this.narrow}>
        ${this._manifest
          ? html`
              <a
                slot="toolbar-icon"
                href=${this._manifest.is_built_in
                  ? documentationUrl(
                      this.hass,
                      `/integrations/${this._manifest.domain}`
                    )
                  : this._manifest.documentation}
                rel="noreferrer"
                target="_blank"
              >
                <ha-icon-button
                  .label=${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.documentation"
                  )}
                  .path=${mdiHelpCircleOutline}
                ></ha-icon-button>
              </a>
            `
          : nothing}
        ${this._manifest?.config_flow || this._logInfo
          ? html`<ha-md-button-menu positioning="popover" slot="toolbar-icon">
              <ha-icon-button
                slot="trigger"
                .label=${this.hass.localize("ui.common.menu")}
                .path=${mdiDotsVertical}
              ></ha-icon-button>
              ${this._manifest &&
              (this._manifest.is_built_in || this._manifest.issue_tracker)
                ? html`
                    <ha-md-menu-item
                      .href=${integrationIssuesUrl(this.domain, this._manifest)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      ${this.hass.localize(
                        "ui.panel.config.integrations.config_entry.known_issues"
                      )}
                      <ha-svg-icon slot="start" .path=${mdiBug}></ha-svg-icon>
                      <ha-svg-icon
                        slot="end"
                        .path=${mdiOpenInNew}
                      ></ha-svg-icon>
                    </ha-md-menu-item>
                  `
                : nothing}
              ${this._logInfo
                ? html`<ha-md-menu-item
                    @click=${this._logInfo.level === LogSeverity.DEBUG
                      ? this._handleDisableDebugLogging
                      : this._handleEnableDebugLogging}
                  >
                    ${this._logInfo.level === LogSeverity.DEBUG
                      ? this.hass.localize(
                          "ui.panel.config.integrations.config_entry.disable_debug_logging"
                        )
                      : this.hass.localize(
                          "ui.panel.config.integrations.config_entry.enable_debug_logging"
                        )}
                    <ha-svg-icon
                      slot="start"
                      class=${this._logInfo.level === LogSeverity.DEBUG
                        ? "warning"
                        : ""}
                      .path=${this._logInfo.level === LogSeverity.DEBUG
                        ? mdiBugStop
                        : mdiBugPlay}
                    ></ha-svg-icon>
                  </ha-md-menu-item>`
                : nothing}
            </ha-md-button-menu>`
          : nothing}

        <div class="container">
          <div class="header">
            <div class="title-container">
              <div class="logo-container">
                <img
                  alt=${domainToName(this.hass.localize, this.domain)}
                  src=${brandsUrl({
                    domain: this.domain,
                    type: "icon@2x",
                    darkOptimized: this.hass.themes?.darkMode,
                  })}
                  crossorigin="anonymous"
                  referrerpolicy="no-referrer"
                  @load=${this._onImageLoad}
                  @error=${this._onImageError}
                />
              </div>
              <div class="title">
                <h1>${domainToName(this.hass.localize, this.domain)}</h1>
                <div class="sub">
                  ${this._manifest?.version != null
                    ? html`<span class="version"
                        >${this.hass.localize(
                          "ui.panel.config.integrations.config_entry.version",
                          { version: this._manifest.version }
                        )}</span
                      >`
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
                  ${this._manifest?.is_built_in &&
                  this._manifest.quality_scale &&
                  Object.keys(QUALITY_SCALE_MAP).includes(
                    this._manifest.quality_scale
                  )
                    ? html`
                        <div class="integration-info">
                          <a
                            href=${documentationUrl(
                              this.hass,
                              `/docs/quality_scale/#-${this._manifest.quality_scale}`
                            )}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            <ha-svg-icon
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
                              class="open-external"
                              .path=${mdiOpenInNew}
                            ></ha-svg-icon>
                          </a>
                        </div>
                      `
                    : nothing}
                </div>
                <div>
                  ${devices.length
                    ? html`
                        <a
                          href=${devices.length === 1
                            ? `/config/devices/device/${devices[0].id}`
                            : `/config/devices/dashboard?historyBack=1&domain=${this.domain}`}
                        >
                          ${this.hass.localize(
                            `ui.panel.config.integrations.config_entry.devices`,
                            { count: devices.length }
                          )}
                        </a>
                      `
                    : nothing}
                  ${devices.length && services.length ? " • " : ""}
                  ${services.length
                    ? html`<a
                        href=${services.length === 1
                          ? `/config/devices/device/${services[0].id}`
                          : `/config/devices/dashboard?historyBack=1&domain=${this.domain}`}
                      >
                        ${this.hass.localize(
                          `ui.panel.config.integrations.config_entry.services`,
                          { count: services.length }
                        )}
                      </a>`
                    : nothing}
                  ${(devices.length || services.length) && numberOfEntities
                    ? " • "
                    : ""}
                  ${numberOfEntities
                    ? html`
                        <a
                          href=${`/config/entities?historyBack=1&domain=${this.domain}`}
                        >
                          ${this.hass.localize(
                            `ui.panel.config.integrations.config_entry.entities`,
                            { count: numberOfEntities }
                          )}
                        </a>
                      `
                    : nothing}
                </div>
              </div>
            </div>
            <div class="actions">
              ${canAddDevice
                ? html`
                    <ha-button @click=${this._addDevice}>
                      ${this.hass.localize(
                        "ui.panel.config.integrations.integration_page.add_device"
                      )}
                    </ha-button>
                  `
                : nothing}
              <ha-button
                .appearance=${canAddDevice ? "filled" : "accent"}
                @click=${this._addIntegration}
              >
                ${this._manifest?.integration_type
                  ? this.hass.localize(
                      `ui.panel.config.integrations.integration_page.add_${this._manifest.integration_type}`
                    )
                  : this.hass.localize(
                      `ui.panel.config.integrations.integration_page.add_entry`
                    )}
              </ha-button>
              ${Array.from(supportedSubentryTypes).map(
                (flowType) =>
                  html`<ha-button
                    appearance="filled"
                    @click=${this._addSubEntry}
                    .flowType=${flowType}
                    .disabled=${!normalEntries.length}
                    reduce-left-padding
                  >
                    <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
                    ${this.hass.localize(
                      `component.${this.domain}.config_subentries.${flowType}.initiate_flow.user`
                    )}</ha-button
                  >`
              )}
            </div>
          </div>

          ${this._logInfo?.level === LogSeverity.DEBUG
            ? html`<div class="section">
                <ha-alert alert-type="warning">
                  <ha-svg-icon slot="icon" .path=${mdiBugPlay}></ha-svg-icon>
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.debug_logging_enabled"
                  )}
                  <ha-button
                    size="small"
                    variant="warning"
                    slot="action"
                    @click=${this._handleDisableDebugLogging}
                  >
                    ${this.hass.localize("ui.common.disable")}
                  </ha-button>
                </ha-alert>
              </div>`
            : nothing}
          ${discoveryFlows.length
            ? html`
                <div class="section">
                  <h3 class="section-header">
                    ${this.hass.localize(
                      "ui.panel.config.integrations.discovered"
                    )}
                  </h3>
                  <ha-md-list class="discovered">
                    ${discoveryFlows.map(
                      (flow) =>
                        html`<ha-md-list-item class="discovered">
                          ${flow.localized_title}
                          <ha-button
                            slot="end"
                            variant="success"
                            size="small"
                            .flow=${flow}
                            @click=${this._continueFlow}
                          >
                            ${this.hass.localize("ui.common.add")}
                          </ha-button>
                        </ha-md-list-item>`
                    )}
                  </ha-md-list>
                </div>
              `
            : nothing}
          ${attentionFlows.length || attentionEntries.length
            ? html`
                <div class="section">
                  <h3 class="section-header">
                    ${this.hass.localize(
                      `ui.panel.config.integrations.integration_page.attention_entries`
                    )}
                  </h3>
                  ${attentionFlows.length
                    ? html`<ha-md-list class="attention">
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
                              .flow=${flow}
                              @click=${this._continueFlow}
                              variant="warning"
                              >${this.hass.localize(
                                `ui.panel.config.integrations.${
                                  attention ? "reconfigure" : "configure"
                                }`
                              )}</ha-button
                            >
                          </ha-md-list-item>`;
                        })}
                      </ha-md-list>`
                    : nothing}
                  ${attentionEntries.map(
                    (item) =>
                      html`<ha-config-entry-row
                        class="attention"
                        .hass=${this.hass}
                        .narrow=${this.narrow}
                        .manifest=${this._manifest}
                        .diagnosticHandler=${this._diagnosticHandler}
                        .entities=${this._entities}
                        .entry=${item}
                        data-entry-id=${item.entry_id}
                      ></ha-config-entry-row>`
                  )}
                </div>
              `
            : nothing}

          <div class="section">
            <h3 class="section-header">
              ${this._manifest?.integration_type
                ? this.hass.localize(
                    `ui.panel.config.integrations.integration_page.entries_${this._manifest.integration_type}`
                  )
                : this.hass.localize(
                    `ui.panel.config.integrations.integration_page.entries`
                  )}
            </h3>
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
              : html`
                  ${normalEntries.map(
                    (item) =>
                      html`<ha-config-entry-row
                        .hass=${this.hass}
                        .narrow=${this.narrow}
                        .manifest=${this._manifest}
                        .diagnosticHandler=${this._diagnosticHandler}
                        .entities=${this._entities}
                        .entry=${item}
                        data-entry-id=${item.entry_id}
                      ></ha-config-entry-row>`
                  )}
                `}
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

  private _addDevice() {
    protocolIntegrationPicked(this, this.hass, this.domain);
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
    const flowType = ev.target.flowType;

    const configEntries = this._domainConfigEntries(
      this.domain,
      this._extraConfigEntries || this.configEntries
    ).filter((entry) => entry.source !== "ignore");

    if (!configEntries.length) {
      return;
    }

    if (configEntries.length === 1 && configEntries[0].state === "loaded") {
      showSubConfigFlowDialog(this, configEntries[0], flowType, {
        startFlowHandler: configEntries[0].entry_id,
      });
      return;
    }

    showPickConfigEntryDialog(this, {
      domain: this.domain,
      subFlowType: flowType,
      configEntries,
      configEntryPicked: (entry) => {
        showSubConfigFlowDialog(this, entry, flowType, {
          startFlowHandler: entry.entry_id,
        });
      },
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
          padding: 32px;
        }
        .container > * {
          flex-grow: 1;
        }
        .header {
          display: flex;
          flex-wrap: wrap;
          gap: 24px;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .title-container {
          display: flex;
          align-items: center;
        }
        .title {
          display: flex;
          gap: 4px;
          flex-direction: column;
          justify-content: space-between;
        }
        .title h1 {
          font-family: var(--ha-font-family-body);
          font-size: 32px;
          font-weight: 700;
          line-height: 40px;
          text-align: left;
          text-underline-position: from-font;
          text-decoration-skip-ink: none;
          margin: 0;
        }
        .sub {
          display: flex;
          flex-wrap: wrap;
          gap: 8px 16px;
          align-items: center;
        }
        .card-content {
          padding: 16px 0 8px;
        }
        :host([narrow]) .container {
          padding: 16px;
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
          margin-right: 16px;
          margin-inline-end: 16px;
          margin-inline-start: initial;
          padding: 0 8px;
        }
        .logo-container img {
          width: 80px;
        }
        .version {
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
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .section {
          width: 100%;
        }
        .section-header {
          margin-inline-start: 16px;
          margin-top: 6px;
          margin-bottom: 6px;
          font-family: var(--ha-font-family-body);
          font-size: 14px;
          font-weight: 500;
          line-height: 20px;
          letter-spacing: 0.10000000149011612px;
          text-align: left;
          text-underline-position: from-font;
          text-decoration-skip-ink: none;
          color: var(--secondary-text-color);
        }
        .integration-info {
          display: flex;
          align-items: center;
          gap: 8px;
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
        ha-svg-icon.legacy-quality {
          color: var(--mdc-theme-text-icon-on-background, rgba(0, 0, 0, 0.38));
          animation: unset;
        }
        ha-md-list {
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          padding: 0;
        }
        .discovered {
          --md-list-container-color: rgba(var(--rgb-success-color), 0.2);
        }
        .attention {
          --md-list-container-color: rgba(var(--rgb-warning-color), 0.2);
        }
        ha-md-list-item {
          --md-list-item-top-space: 4px;
          --md-list-item-bottom-space: 4px;
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
        ha-config-entry-row {
          display: block;
          margin-bottom: 16px;
        }
        a {
          text-decoration: none;
        }
        .highlight::after {
          background-color: var(--info-color);
        }
        .warning {
          color: var(--error-color);
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
        a[slot="toolbar-icon"] {
          color: var(--sidebar-icon-color);
        }
        ha-svg-icon.open-external {
          min-width: 14px;
          width: 14px;
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
