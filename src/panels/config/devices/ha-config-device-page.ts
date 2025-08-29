import { consume } from "@lit/context";
import {
  mdiCog,
  mdiDelete,
  mdiDotsVertical,
  mdiDownload,
  mdiMicrophone,
  mdiOpenInNew,
  mdiPencil,
  mdiPlusCircle,
  mdiRestore,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { ASSIST_ENTITIES, SENSOR_ENTITIES } from "../../../common/const";
import { computeDeviceNameDisplay } from "../../../common/entity/compute_device_name";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeEntityEntryName } from "../../../common/entity/compute_entity_name";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stringCompare } from "../../../common/string/compare";
import { groupBy } from "../../../common/util/group-by";
import "../../../components/entity/ha-battery-icon";
import "../../../components/ha-alert";
import "../../../components/ha-button";
import "../../../components/ha-button-menu";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-next";
import "../../../components/ha-list-item";
import "../../../components/ha-svg-icon";
import "../../../components/ha-tooltip";
import { assistSatelliteSupportsSetupFlow } from "../../../data/assist_satellite";
import { getSignedPath } from "../../../data/auth";
import type {
  ConfigEntry,
  DisableConfigEntryResult,
} from "../../../data/config_entries";
import {
  disableConfigEntry,
  sortConfigEntries,
} from "../../../data/config_entries";
import { fullEntitiesContext } from "../../../data/context";
import type { DeviceRegistryEntry } from "../../../data/device_registry";
import {
  removeConfigEntryFromDevice,
  updateDeviceRegistryEntry,
} from "../../../data/device_registry";
import type { DiagnosticInfo } from "../../../data/diagnostics";
import {
  fetchDiagnosticHandler,
  getConfigEntryDiagnosticsDownloadUrl,
  getDeviceDiagnosticsDownloadUrl,
} from "../../../data/diagnostics";
import type { EntityRegistryEntry } from "../../../data/entity_registry";
import {
  findBatteryChargingEntity,
  findBatteryEntity,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import type { IntegrationManifest } from "../../../data/integration";
import { domainToName } from "../../../data/integration";
import { regenerateEntityIds } from "../../../data/regenerate_entity_ids";
import type { SceneEntities } from "../../../data/scene";
import { showSceneEditor } from "../../../data/scene";
import type { RelatedResult } from "../../../data/search";
import { findRelated } from "../../../data/search";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import { showVoiceAssistantSetupDialog } from "../../../dialogs/voice-assistant-setup/show-voice-assistant-setup-dialog";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { fileDownload } from "../../../util/file_download";
import "../../logbook/ha-logbook";
import "./device-detail/ha-device-entities-card";
import "./device-detail/ha-device-info-card";
import "./device-detail/ha-device-via-devices-card";
import { showDeviceAutomationDialog } from "./device-detail/show-dialog-device-automation";
import {
  loadDeviceRegistryDetailDialog,
  showDeviceRegistryDetailDialog,
} from "./device-registry-detail/show-dialog-device-registry-detail";
import { slugify } from "../../../common/string/slugify";

export interface EntityRegistryStateEntry extends EntityRegistryEntry {
  stateName?: string | null;
}

export interface DeviceAction {
  href?: string;
  target?: string;
  action?: (ev: any) => void;
  label: string;
  icon?: string;
  trailingIcon?: string;
  classes?: string;
}

export interface DeviceAlert {
  level: "warning" | "error" | "info";
  text: string;
}

const DEVICE_ALERTS_INTERVAL = 30000;

@customElement("ha-config-device-page")
export class HaConfigDevicePage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public entries!: ConfigEntry[];

  @property({ attribute: false }) public manifests!: IntegrationManifest[];

  @property({ attribute: false }) public deviceId!: string;

  @property({ type: Boolean, reflect: true }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public showAdvanced = false;

  @state() private _related?: RelatedResult;

  @state() private _diagnosticDownloadLinks: DeviceAction[] = [];

  @state() private _deleteButtons: DeviceAction[] = [];

  @state() private _deviceActions: DeviceAction[] = [];

  @state() private _deviceAlerts: DeviceAlert[] = [];

  private _deviceAlertsActionsTimeout?: number;

  @state()
  @consume({ context: fullEntitiesContext, subscribe: true })
  _entityReg!: EntityRegistryEntry[];

  private _logbookTime = { recent: 86400 };

  private _integrations = memoizeOne(
    (
      device: DeviceRegistryEntry,
      entries: ConfigEntry[],
      manifests: IntegrationManifest[]
    ): ConfigEntry[] => {
      const entryLookup: Record<string, ConfigEntry> = {};
      for (const entry of entries) {
        entryLookup[entry.entry_id] = entry;
      }
      const manifestLookup: Record<string, IntegrationManifest> = {};
      for (const manifest of manifests) {
        manifestLookup[manifest.domain] = manifest;
      }
      const deviceEntries = device.config_entries
        .filter((entId) => entId in entryLookup)
        .map((entry) => entryLookup[entry]);

      return sortConfigEntries(deviceEntries, device.primary_config_entry);
    }
  );

  private _entities = memoizeOne(
    (
      deviceId: string,
      entities: EntityRegistryEntry[]
    ): EntityRegistryStateEntry[] =>
      entities
        .filter((entity) => entity.device_id === deviceId)
        .map((entity) => ({
          ...entity,
          stateName: this._computeEntityName(entity),
        }))
        .sort((ent1, ent2) =>
          stringCompare(
            ent1.stateName || `zzz${ent1.entity_id}`,
            ent2.stateName || `zzz${ent2.entity_id}`,
            this.hass.locale.language
          )
        )
  );

  private _getEntitiesSorted = (entities: HassEntity[]) =>
    entities.sort((ent1, ent2) =>
      stringCompare(
        ent1.attributes.friendly_name || `zzz${ent1.entity_id}`,
        ent2.attributes.friendly_name || `zzz${ent2.entity_id}`,
        this.hass.locale.language
      )
    );

  private _getRelated = memoizeOne((related?: RelatedResult) => ({
    automation: this._getEntitiesSorted(
      (related?.automation ?? []).map((entityId) => this.hass.states[entityId])
    ),
    scene: this._getEntitiesSorted(
      (related?.scene ?? []).map((entityId) => this.hass.states[entityId])
    ),
    script: this._getEntitiesSorted(
      (related?.script ?? []).map((entityId) => this.hass.states[entityId])
    ),
  }));

  private _deviceIdInList = memoizeOne((deviceId: string) => [deviceId]);

  private _entityIds = memoizeOne(
    (entries: EntityRegistryStateEntry[]): string[] =>
      entries.map((entry) => entry.entity_id)
  );

  private _entitiesByCategory = memoizeOne(
    (entities: EntityRegistryEntry[]) => {
      const result = groupBy(entities, (entry) => {
        const domain = computeDomain(entry.entity_id);

        if (ASSIST_ENTITIES.includes(domain)) {
          return "assist";
        }

        if (domain === "event" || domain === "notify") {
          return domain;
        }

        if (entry.entity_category) {
          return entry.entity_category;
        }

        if (SENSOR_ENTITIES.includes(domain)) {
          return "sensor";
        }

        return "control";
      }) as Record<
        | "control"
        | "event"
        | "sensor"
        | "assist"
        | "notify"
        | NonNullable<EntityRegistryEntry["entity_category"]>,
        EntityRegistryStateEntry[]
      >;
      for (const key of [
        "assist",
        "config",
        "control",
        "diagnostic",
        "event",
        "notify",
        "sensor",
      ]) {
        if (!(key in result)) {
          result[key] = [];
        }
      }

      return result;
    }
  );

  private _batteryEntity = memoizeOne(
    (entities: EntityRegistryEntry[]): EntityRegistryEntry | undefined =>
      findBatteryEntity(this.hass, entities)
  );

  private _batteryChargingEntity = memoizeOne(
    (entities: EntityRegistryEntry[]): EntityRegistryEntry | undefined =>
      findBatteryChargingEntity(this.hass, entities)
  );

  public willUpdate(changedProps: PropertyValues<this>) {
    super.willUpdate(changedProps);

    if (changedProps.has("deviceId")) {
      this._deviceActions = [];
      this._deviceAlerts = [];
      this._deleteButtons = [];
      this._diagnosticDownloadLinks = [];
    }

    if (changedProps.has("deviceId") || changedProps.has("entries")) {
      this._fetchData();
    }
  }

  protected firstUpdated(changedProps: PropertyValues) {
    super.firstUpdated(changedProps);
    loadDeviceRegistryDetailDialog();
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("deviceId")) {
      this._findRelated();
    }
  }

  public disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._deviceAlertsActionsTimeout);
  }

  protected render() {
    if (!this.hass || !this.deviceId) {
      return nothing;
    }
    const device = this.hass.devices[this.deviceId];

    if (!device) {
      return html`
        <hass-error-screen
          .hass=${this.hass}
          .error=${this.hass.localize(
            "ui.panel.config.devices.device_not_found"
          )}
        ></hass-error-screen>
      `;
    }

    const deviceName = computeDeviceNameDisplay(device, this.hass);
    const integrations = this._integrations(
      device,
      this.entries,
      this.manifests
    );
    const entities = this._entities(this.deviceId, this._entityReg);
    const entitiesByCategory = this._entitiesByCategory(entities);
    const batteryEntity = this._batteryEntity(entities);
    const batteryChargingEntity = this._batteryChargingEntity(entities);
    const battery = batteryEntity
      ? this.hass.states[batteryEntity.entity_id]
      : undefined;
    const batteryDomain = battery ? computeStateDomain(battery) : undefined;

    const batteryChargingState = batteryChargingEntity
      ? this.hass.states[batteryChargingEntity.entity_id]
      : undefined;
    const area = device.area_id ? this.hass.areas[device.area_id] : undefined;

    const deviceInfo: TemplateResult[] = integrations.map(
      (integration) =>
        html`<a
          slot="actions"
          href=${`/config/integrations/integration/${integration.domain}#config_entry=${integration.entry_id}`}
        >
          <ha-list-item graphic="icon" hasMeta>
            <img
              slot="graphic"
              alt=${domainToName(this.hass.localize, integration.domain)}
              src=${brandsUrl({
                domain: integration.domain,
                type: "icon",
                darkOptimized: this.hass.themes?.darkMode,
              })}
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
              @error=${this._onImageError}
              @load=${this._onImageLoad}
            />

            ${domainToName(this.hass.localize, integration.domain)}
            <ha-icon-next slot="meta"></ha-icon-next>
          </ha-list-item>
        </a>`
    );

    const actions = [...(this._deviceActions || [])];
    if (Array.isArray(this._diagnosticDownloadLinks)) {
      actions.push(...this._diagnosticDownloadLinks);
    }
    if (this._deleteButtons) {
      actions.push(...this._deleteButtons);
    }

    // Move all warning actions to the end
    actions.sort((a, b) => {
      if (a.classes === "warning" && b.classes !== "warning") {
        return 1;
      }
      if (a.classes !== "warning" && b.classes === "warning") {
        return -1;
      }
      return 0;
    });

    const firstDeviceAction = actions.shift();

    if (device.disabled_by) {
      deviceInfo.push(html`
        <ha-alert alert-type="warning">
          ${this.hass.localize("ui.panel.config.devices.enabled_cause", {
            type: this.hass.localize(
              `ui.panel.config.devices.type.${device.entry_type || "device"}`
            ),
            cause: this.hass.localize(
              `ui.panel.config.devices.disabled_by.${device.disabled_by}`
            ),
          })}
        </ha-alert>
        ${device.disabled_by === "user"
          ? html`
              <div class="card-actions" slot="actions">
                <ha-button
                  variant="warning"
                  size="small"
                  @click=${this._enableDevice}
                >
                  ${this.hass.localize("ui.common.enable")}
                </ha-button>
              </div>
            `
          : ""}
      `);
    }

    this._renderIntegrationInfo(device, integrations, deviceInfo);

    const add_prompt = device.disabled_by
      ? this.hass.localize("ui.panel.config.devices.add_prompt_disabled")
      : this.hass.localize("ui.panel.config.devices.add_prompt_enabled");

    const automationCard = isComponentLoaded(this.hass, "automation")
      ? html`
          <ha-card outlined>
            <h1 class="card-header">
              ${this.hass.localize(
                "ui.panel.config.devices.automation.automations_heading"
              )}
              <ha-icon-button
                @click=${this._showAutomationDialog}
                .disabled=${device.disabled_by}
                .label=${device.disabled_by
                  ? this.hass.localize(
                      "ui.panel.config.devices.automation.create_disable",
                      {
                        type: this.hass.localize(
                          `ui.panel.config.devices.type.${
                            device.entry_type || "device"
                          }`
                        ),
                      }
                    )
                  : this.hass.localize(
                      "ui.panel.config.devices.automation.create",
                      {
                        type: this.hass.localize(
                          `ui.panel.config.devices.type.${
                            device.entry_type || "device"
                          }`
                        ),
                      }
                    )}
                .path=${mdiPlusCircle}
              ></ha-icon-button>
            </h1>
            ${this._related?.automation?.length
              ? html`
                  <div class="items">
                    ${this._getRelated(this._related).automation.map(
                      (automation) => {
                        const entityState = automation;
                        return entityState
                          ? html`<a
                              href=${ifDefined(
                                entityState.attributes.id
                                  ? `/config/automation/edit/${encodeURIComponent(entityState.attributes.id)}`
                                  : `/config/automation/show/${entityState.entity_id}`
                              )}
                            >
                              <ha-list-item hasMeta .automation=${entityState}>
                                ${computeStateName(entityState)}
                                <ha-icon-next slot="meta"></ha-icon-next>
                              </ha-list-item>
                            </a>`
                          : nothing;
                      }
                    )}
                  </div>
                `
              : html`
                  <div class="card-content">
                    ${this.hass.localize("ui.panel.config.devices.add_prompt", {
                      name: this.hass.localize(
                        "ui.panel.config.devices.automation.automations"
                      ),
                      type: this.hass.localize(
                        `ui.panel.config.devices.type.${
                          device.entry_type || "device"
                        }`
                      ),
                    })}
                    ${add_prompt}
                  </div>
                `}
          </ha-card>
        `
      : "";

    const sceneCard =
      isComponentLoaded(this.hass, "scene") && entities.length
        ? html`
            <ha-card outlined>
              <h1 class="card-header">
                ${this.hass.localize(
                  "ui.panel.config.devices.scene.scenes_heading"
                )}

                <ha-icon-button
                  @click=${this._createScene}
                  .disabled=${device.disabled_by}
                  .label=${device.disabled_by
                    ? this.hass.localize(
                        "ui.panel.config.devices.scene.create_disable",
                        {
                          type: this.hass.localize(
                            `ui.panel.config.devices.type.${
                              device.entry_type || "device"
                            }`
                          ),
                        }
                      )
                    : this.hass.localize(
                        "ui.panel.config.devices.scene.create",
                        {
                          type: this.hass.localize(
                            `ui.panel.config.devices.type.${
                              device.entry_type || "device"
                            }`
                          ),
                        }
                      )}
                  .path=${mdiPlusCircle}
                ></ha-icon-button>
              </h1>
              ${this._related?.scene?.length
                ? html`
                    <div class="items">
                      ${this._getRelated(this._related).scene.map((scene) => {
                        const entityState = scene;
                        return entityState && entityState.attributes.id
                          ? html`
                              <a
                                href=${`/config/scene/edit/${entityState.attributes.id}`}
                              >
                                <ha-list-item hasMeta .scene=${entityState}>
                                  ${computeStateName(entityState)}
                                  <ha-icon-next slot="meta"></ha-icon-next>
                                </ha-list-item>
                              </a>
                            `
                          : html`
                              <ha-list-item
                                .id="scene-${slugify(entityState.entity_id)}"
                                hasMeta
                                .scene=${entityState}
                              >
                                ${computeStateName(entityState)}
                                <ha-icon-next slot="meta"></ha-icon-next>
                              </ha-list-item>
                              <ha-tooltip
                                .for="scene-${slugify(entityState.entity_id)}"
                                placement="left"
                              >
                                ${this.hass.localize(
                                  "ui.panel.config.devices.cant_edit"
                                )}
                              </ha-tooltip>
                            `;
                      })}
                    </div>
                  `
                : html`
                    <div class="card-content">
                      ${this.hass.localize(
                        "ui.panel.config.devices.add_prompt",
                        {
                          name: this.hass.localize(
                            "ui.panel.config.devices.scene.scenes"
                          ),
                          type: this.hass.localize(
                            `ui.panel.config.devices.type.${
                              device.entry_type || "device"
                            }`
                          ),
                        }
                      )}
                      ${add_prompt}
                    </div>
                  `}
            </ha-card>
          `
        : "";

    const scriptCard = isComponentLoaded(this.hass, "script")
      ? html`
          <ha-card outlined>
            <h1 class="card-header">
              ${this.hass.localize(
                "ui.panel.config.devices.script.scripts_heading"
              )}
              <ha-icon-button
                @click=${this._showScriptDialog}
                .disabled=${device.disabled_by}
                .label=${device.disabled_by
                  ? this.hass.localize(
                      "ui.panel.config.devices.script.create_disable",
                      {
                        type: this.hass.localize(
                          `ui.panel.config.devices.type.${
                            device.entry_type || "device"
                          }`
                        ),
                      }
                    )
                  : this.hass.localize(
                      "ui.panel.config.devices.script.create",
                      {
                        type: this.hass.localize(
                          `ui.panel.config.devices.type.${
                            device.entry_type || "device"
                          }`
                        ),
                      }
                    )}
                .path=${mdiPlusCircle}
              ></ha-icon-button>
            </h1>
            ${this._related?.script?.length
              ? html`
                  <div class="items">
                    ${this._getRelated(this._related).script.map((script) => {
                      const entityState = script;
                      const entry = this._entityReg.find(
                        (e) => e.entity_id === script.entity_id
                      );
                      let url = `/config/script/show/${entityState.entity_id}`;
                      if (entry) {
                        url = `/config/script/edit/${entry.unique_id}`;
                      }
                      return entityState
                        ? html`
                            <a href=${url}>
                              <ha-list-item hasMeta .script=${script}>
                                ${computeStateName(entityState)}
                                <ha-icon-next slot="meta"></ha-icon-next>
                              </ha-list-item>
                            </a>
                          `
                        : "";
                    })}
                  </div>
                `
              : html`
                  <div class="card-content">
                    ${this.hass.localize("ui.panel.config.devices.add_prompt", {
                      name: this.hass.localize(
                        "ui.panel.config.devices.script.scripts"
                      ),
                      type: this.hass.localize(
                        `ui.panel.config.devices.type.${
                          device.entry_type || "device"
                        }`
                      ),
                    })}
                    ${add_prompt}
                  </div>
                `}
          </ha-card>
        `
      : "";

    return html`<hass-subpage
      .hass=${this.hass}
      .narrow=${this.narrow}
      .header=${deviceName}
    >
      <ha-icon-button
        slot="toolbar-icon"
        .path=${mdiPencil}
        @click=${this._showSettings}
        .label=${this.hass.localize("ui.panel.config.devices.edit_settings")}
      ></ha-icon-button>
      <ha-md-button-menu slot="toolbar-icon">
        <ha-icon-button
          slot="trigger"
          .label=${this.hass.localize("ui.common.menu")}
          .path=${mdiDotsVertical}
        ></ha-icon-button>

        <ha-md-menu-item .clickAction=${this._resetEntityIds}>
          <ha-svg-icon slot="start" .path=${mdiRestore}></ha-svg-icon>
          <div slot="headline">
            ${this.hass.localize("ui.panel.config.devices.restore_entity_ids")}
          </div>
        </ha-md-menu-item>
      </ha-md-button-menu>

      <div class="container">
        <div class="header fullwidth">
          ${area
            ? html`<div class="header-name">
                <a href="/config/areas/area/${area.area_id}"
                  >${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.area",
                    { area: area.name || "Unnamed Area" }
                  )}</a
                >
              </div>`
            : ""}
          <div class="header-right">
            ${battery &&
            (batteryDomain === "binary_sensor" || !isNaN(battery.state as any))
              ? html`
                  <div class="battery">
                    ${batteryDomain === "sensor"
                      ? this.hass.formatEntityState(battery)
                      : nothing}
                    <ha-battery-icon
                      .hass=${this.hass}
                      .batteryStateObj=${battery}
                      .batteryChargingStateObj=${batteryChargingState}
                    ></ha-battery-icon>
                  </div>
                `
              : ""}
            ${integrations.length
              ? html`
                  <img
                    alt=${domainToName(
                      this.hass.localize,
                      integrations[0].domain
                    )}
                    src=${brandsUrl({
                      domain: integrations[0].domain,
                      type: "logo",
                      darkOptimized: this.hass.themes?.darkMode,
                    })}
                    crossorigin="anonymous"
                    referrerpolicy="no-referrer"
                    @load=${this._onImageLoad}
                    @error=${this._onImageError}
                  />
                `
              : ""}
          </div>
        </div>
        <div class="column">
          ${this._deviceAlerts?.length
            ? html`
                <div>
                  ${this._deviceAlerts.map(
                    (alert) => html`
                      <ha-alert .alertType=${alert.level}>
                        ${alert.text}
                      </ha-alert>
                    `
                  )}
                </div>
              `
            : ""}
          <ha-device-info-card .hass=${this.hass} .device=${device}>
            ${deviceInfo}
            ${firstDeviceAction || actions.length
              ? html`
                  <div class="card-actions" slot="actions">
                    <div>
                      <ha-button
                        href=${ifDefined(firstDeviceAction!.href)}
                        rel=${ifDefined(
                          firstDeviceAction!.target ? "noreferrer" : undefined
                        )}
                        appearance="plain"
                        target=${ifDefined(firstDeviceAction!.target)}
                        class=${ifDefined(firstDeviceAction!.classes)}
                        .action=${firstDeviceAction!.action}
                        @click=${this._deviceActionClicked}
                      >
                        ${firstDeviceAction!.label}
                        ${firstDeviceAction!.icon
                          ? html`
                              <ha-svg-icon
                                class=${ifDefined(firstDeviceAction!.classes)}
                                .path=${firstDeviceAction!.icon}
                                slot="start"
                              ></ha-svg-icon>
                            `
                          : nothing}
                        ${firstDeviceAction!.trailingIcon
                          ? html`
                              <ha-svg-icon
                                .path=${firstDeviceAction!.trailingIcon}
                                slot="end"
                              ></ha-svg-icon>
                            `
                          : nothing}
                      </ha-button>
                    </div>

                    ${actions.length
                      ? html`
                          <ha-button-menu>
                            <ha-icon-button
                              slot="trigger"
                              .label=${this.hass.localize("ui.common.menu")}
                              .path=${mdiDotsVertical}
                            ></ha-icon-button>
                            ${actions.map((deviceAction) => {
                              const listItem = html`<ha-list-item
                                class=${ifDefined(deviceAction.classes)}
                                .action=${deviceAction.action}
                                @click=${this._deviceActionClicked}
                                graphic="icon"
                                .hasMeta=${Boolean(deviceAction.trailingIcon)}
                              >
                                ${deviceAction.label}
                                ${deviceAction.icon
                                  ? html`
                                      <ha-svg-icon
                                        class=${ifDefined(deviceAction.classes)}
                                        .path=${deviceAction.icon}
                                        slot="graphic"
                                      ></ha-svg-icon>
                                    `
                                  : ""}
                                ${deviceAction.trailingIcon
                                  ? html`
                                      <ha-svg-icon
                                        slot="meta"
                                        .path=${deviceAction.trailingIcon}
                                      ></ha-svg-icon>
                                    `
                                  : ""}
                              </ha-list-item>`;
                              return deviceAction.href
                                ? html`<a
                                    href=${deviceAction.href}
                                    target=${ifDefined(deviceAction.target)}
                                    rel=${ifDefined(
                                      deviceAction.target
                                        ? "noreferrer"
                                        : undefined
                                    )}
                                    >${listItem}
                                  </a>`
                                : listItem;
                            })}
                          </ha-button-menu>
                        `
                      : ""}
                  </div>
                `
              : ""}
          </ha-device-info-card>
          ${!this.narrow ? [automationCard, sceneCard, scriptCard] : ""}
        </div>
        <div class="column">
          ${(
            [
              "control",
              "sensor",
              "notify",
              "event",
              "assist",
              "config",
              "diagnostic",
            ] as const
          ).map((category) =>
            // Make sure we render controls if no other cards will be rendered
            entitiesByCategory[category].length > 0 ||
            (entities.length === 0 && category === "control")
              ? html`
                  <ha-device-entities-card
                    .hass=${this.hass}
                    .header=${this.hass.localize(
                      `ui.panel.config.devices.entities.${category}`
                    )}
                    .deviceName=${deviceName}
                    .entities=${entitiesByCategory[category]}
                    .showHidden=${device.disabled_by !== null}
                  >
                  </ha-device-entities-card>
                `
              : ""
          )}
          <ha-device-via-devices-card
            .hass=${this.hass}
            .deviceId=${this.deviceId}
          ></ha-device-via-devices-card>
        </div>
        <div class="column">
          ${this.narrow ? [automationCard, sceneCard, scriptCard] : ""}
          ${isComponentLoaded(this.hass, "logbook")
            ? html`
                <ha-card outlined>
                  <h1 class="card-header">
                    ${this.hass.localize("panel.logbook")}
                  </h1>
                  <ha-logbook
                    .hass=${this.hass}
                    .time=${this._logbookTime}
                    .entityIds=${this._entityIds(entities)}
                    .deviceIds=${this._deviceIdInList(this.deviceId)}
                    virtualize
                    narrow
                    no-icon
                  ></ha-logbook>
                </ha-card>
              `
            : ""}
        </div>
      </div>
    </hass-subpage>`;
  }

  private _fetchData() {
    if (this.deviceId && this.entries.length) {
      this._getDiagnosticButtons();
      this._getDeleteActions();
      clearTimeout(this._deviceAlertsActionsTimeout);
      this._getDeviceActions();
      this._getDeviceAlerts();
    }
  }

  private async _getDiagnosticButtons(): Promise<void> {
    const deviceId = this.deviceId;
    if (!isComponentLoaded(this.hass, "diagnostics")) {
      return;
    }

    const device = this.hass.devices[this.deviceId];

    if (!device) {
      return;
    }

    let links = await Promise.all(
      this._integrations(device, this.entries, this.manifests).map(
        async (entry): Promise<boolean | { link: string; domain: string }> => {
          if (entry.state !== "loaded") {
            return false;
          }
          let info: DiagnosticInfo;
          try {
            info = await fetchDiagnosticHandler(this.hass, entry.domain);
          } catch (err: any) {
            if (err.code === "not_found") {
              return false;
            }
            throw err;
          }

          if (!info.handlers.device && !info.handlers.config_entry) {
            return false;
          }
          return {
            link: info.handlers.device
              ? getDeviceDiagnosticsDownloadUrl(entry.entry_id, this.deviceId)
              : getConfigEntryDiagnosticsDownloadUrl(entry.entry_id),
            domain: entry.domain,
          };
        }
      )
    );

    links = links.filter(Boolean);

    if (this.deviceId !== deviceId) {
      // abort if the device has changed
      return;
    }
    if (links.length > 0) {
      this._diagnosticDownloadLinks = (
        links as { link: string; domain: string }[]
      ).map((link) => ({
        href: link.link,
        icon: mdiDownload,
        action: (ev) => this._signUrl(ev),
        label:
          links.length > 1
            ? this.hass.localize(
                `ui.panel.config.devices.download_diagnostics_integration`,
                {
                  integration: domainToName(this.hass.localize, link.domain),
                }
              )
            : this.hass.localize(
                `ui.panel.config.devices.download_diagnostics`
              ),
      }));
    }
  }

  private _getDeleteActions() {
    const deviceId = this.deviceId;
    const device = this.hass.devices[this.deviceId];

    if (!device) {
      return;
    }

    const buttons: DeviceAction[] = [];
    this._integrations(device, this.entries, this.manifests).forEach(
      (entry) => {
        if (entry.state !== "loaded" || !entry.supports_remove_device) {
          return;
        }
        buttons.push({
          action: async () => {
            const confirmed = await showConfirmationDialog(this, {
              text:
                this._integrations(device, this.entries, this.manifests)
                  .length > 1
                  ? this.hass.localize(
                      `ui.panel.config.devices.confirm_delete_integration`,
                      {
                        integration: domainToName(
                          this.hass.localize,
                          entry.domain
                        ),
                      }
                    )
                  : this.hass.localize(
                      `ui.panel.config.devices.confirm_delete`
                    ),
              confirmText: this.hass.localize("ui.common.delete"),
              dismissText: this.hass.localize("ui.common.cancel"),
              destructive: true,
            });

            if (!confirmed) {
              return;
            }

            try {
              await removeConfigEntryFromDevice(
                this.hass!,
                this.deviceId,
                entry.entry_id
              );
            } catch (err: any) {
              showAlertDialog(this, {
                title: this.hass.localize(
                  "ui.panel.config.devices.error_delete"
                ),
                text: err.message,
              });
            }
          },
          classes: "warning",
          icon: mdiDelete,
          label:
            this._integrations(device, this.entries, this.manifests).length > 1
              ? this.hass.localize(
                  `ui.panel.config.devices.delete_device_integration`,
                  {
                    integration: domainToName(this.hass.localize, entry.domain),
                  }
                )
              : this.hass.localize(`ui.panel.config.devices.delete_device`),
        });
      }
    );

    if (this.deviceId !== deviceId) {
      // abort if the device has changed
      return;
    }

    if (buttons.length > 0) {
      this._deleteButtons = buttons;
    }
  }

  private async _getDeviceActions() {
    const deviceId = this.deviceId;
    const device = this.hass.devices[this.deviceId];

    if (!device) {
      return;
    }

    const deviceActions: DeviceAction[] = [];

    const configurationUrlIsHomeAssistant =
      device.configuration_url?.startsWith("homeassistant://") || false;

    const configurationUrl = configurationUrlIsHomeAssistant
      ? device.configuration_url!.replace("homeassistant://", "/")
      : device.configuration_url;

    if (configurationUrl) {
      deviceActions.push({
        href: configurationUrl,
        target: configurationUrlIsHomeAssistant ? undefined : "_blank",
        icon: mdiCog,
        label: this.hass.localize(
          "ui.panel.config.devices.open_configuration_url"
        ),
        trailingIcon: mdiOpenInNew,
      });
    }

    const entities = this._entities(this.deviceId, this._entityReg);

    const assistSatellite = entities.find(
      (ent) => computeDomain(ent.entity_id) === "assist_satellite"
    );

    const domains = this._integrations(
      device,
      this.entries,
      this.manifests
    ).map((int) => int.domain);

    if (
      !domains.includes("voip") &&
      assistSatellite &&
      assistSatelliteSupportsSetupFlow(
        this.hass.states[assistSatellite.entity_id]
      )
    ) {
      deviceActions.push({
        action: this._voiceAssistantSetup,
        label: this.hass.localize(
          "ui.panel.config.devices.set_up_voice_assistant"
        ),
        icon: mdiMicrophone,
      });
    }

    if (domains.includes("mqtt")) {
      const mqtt = await import(
        "./device-detail/integration-elements/mqtt/device-actions"
      );
      const actions = mqtt.getMQTTDeviceActions(this, device);
      deviceActions.push(...actions);
    }
    if (domains.includes("zha")) {
      const zha = await import(
        "./device-detail/integration-elements/zha/device-actions"
      );
      const actions = await zha.getZHADeviceActions(this, this.hass, device);
      deviceActions.push(...actions);
    }
    if (domains.includes("zwave_js")) {
      const zwave = await import(
        "./device-detail/integration-elements/zwave_js/device-actions"
      );
      const actions = await zwave.getZwaveDeviceActions(
        this,
        this.hass,
        device
      );
      deviceActions.push(...actions);
    }
    if (domains.includes("matter")) {
      const matter = await import(
        "./device-detail/integration-elements/matter/device-actions"
      );
      const defaultActions = matter.getMatterDeviceDefaultActions(
        this,
        this.hass,
        device
      );
      deviceActions.push(...defaultActions);

      // load matter device actions async to avoid an UI with 0 actions when the matter integration needs very long to get node diagnostics
      matter.getMatterDeviceActions(this, this.hass, device).then((actions) => {
        if (this.deviceId !== deviceId) {
          // abort if the device has changed
          return;
        }
        this._deviceActions = [...actions, ...(this._deviceActions || [])];
      });
    }

    if (this.deviceId !== deviceId) {
      // abort if the device has changed
      return;
    }

    this._deviceActions = deviceActions;
  }

  private async _getDeviceAlerts() {
    const deviceId = this.deviceId;

    const device = this.hass.devices[this.deviceId];

    if (!device) {
      return;
    }

    const deviceAlerts: DeviceAlert[] = [];

    const domains = this._integrations(
      device,
      this.entries,
      this.manifests
    ).map((int) => int.domain);

    if (domains.includes("zwave_js")) {
      const zwave = await import(
        "./device-detail/integration-elements/zwave_js/device-alerts"
      );

      const alerts = await zwave.getZwaveDeviceAlerts(this.hass, device);
      deviceAlerts.push(...alerts);
    }

    if (this.deviceId !== deviceId) {
      // abort if the device has changed
      return;
    }

    this._deviceAlerts = deviceAlerts;
    if (deviceAlerts.length) {
      this._deviceAlertsActionsTimeout = window.setTimeout(() => {
        this._getDeviceAlerts();
        this._getDeviceActions();
      }, DEVICE_ALERTS_INTERVAL);
    }
  }

  private _computeEntityName(entity: EntityRegistryEntry) {
    const device = this.hass.devices[this.deviceId];
    return (
      computeEntityEntryName(entity, this.hass) ||
      computeDeviceNameDisplay(device, this.hass)
    );
  }

  private _onImageLoad(ev) {
    ev.target.style.display = "inline-block";
  }

  private _onImageError(ev) {
    ev.target.style.display = "none";
  }

  private async _findRelated() {
    this._related = await findRelated(this.hass, "device", this.deviceId);
  }

  private _createScene() {
    const entities: SceneEntities = {};
    this._entities(this.deviceId, this._entityReg).forEach((entity) => {
      entities[entity.entity_id] = "";
    });
    showSceneEditor({
      entities,
    });
  }

  private _showScriptDialog() {
    showDeviceAutomationDialog(this, {
      device: this.hass.devices[this.deviceId],
      entityReg: this._entityReg,
      script: true,
    });
  }

  private _showAutomationDialog() {
    showDeviceAutomationDialog(this, {
      device: this.hass.devices[this.deviceId],
      entityReg: this._entityReg,
      script: false,
    });
  }

  private _renderIntegrationInfo(
    device: DeviceRegistryEntry,
    integrations: ConfigEntry[],
    deviceInfo: TemplateResult[]
  ) {
    const domains = integrations.map((int) => int.domain);
    if (domains.includes("zha")) {
      import("./device-detail/integration-elements/zha/ha-device-info-zha");
      deviceInfo.push(html`
        <ha-device-info-zha
          .hass=${this.hass}
          .device=${device}
        ></ha-device-info-zha>
      `);
    }
    if (domains.includes("zwave_js")) {
      import(
        "./device-detail/integration-elements/zwave_js/ha-device-info-zwave_js"
      );
      deviceInfo.push(html`
        <ha-device-info-zwave_js
          .hass=${this.hass}
          .device=${device}
        ></ha-device-info-zwave_js>
      `);
    }
    if (domains.includes("matter")) {
      import(
        "./device-detail/integration-elements/matter/ha-device-info-matter"
      );
      deviceInfo.push(html`
        <ha-device-info-matter
          .hass=${this.hass}
          .device=${device}
        ></ha-device-info-matter>
      `);
    }
  }

  private _resetEntityIds = () => {
    const entities = this._entities(this.deviceId, this._entityReg).map(
      (e) => e.entity_id
    );
    regenerateEntityIds(this, this.hass, entities);
  };

  private _showSettings = async () => {
    const device = this.hass.devices[this.deviceId];
    showDeviceRegistryDetailDialog(this, {
      device,
      updateEntry: async (updates) => {
        const oldDeviceName = device.name_by_user || device.name;
        const newDeviceName = updates.name_by_user;
        const disabled =
          updates.disabled_by === "user" && device.disabled_by !== "user";

        if (disabled) {
          for (const cnfg_entry of device.config_entries) {
            if (
              !Object.values(this.hass.devices).some(
                (dvc) =>
                  dvc.id !== device.id &&
                  dvc.config_entries.includes(cnfg_entry)
              )
            ) {
              const config_entry = this.entries.find(
                (entry) => entry.entry_id === cnfg_entry
              );
              if (
                config_entry &&
                !config_entry.disabled_by &&
                // eslint-disable-next-line no-await-in-loop
                (await showConfirmationDialog(this, {
                  title: this.hass.localize(
                    "ui.panel.config.devices.confirm_disable_config_entry_title"
                  ),
                  text: this.hass.localize(
                    "ui.panel.config.devices.confirm_disable_config_entry_message",
                    { name: config_entry.title }
                  ),
                  destructive: true,
                  confirmText: this.hass.localize("ui.common.yes"),
                  dismissText: this.hass.localize("ui.common.no"),
                }))
              ) {
                let result: DisableConfigEntryResult;
                try {
                  // eslint-disable-next-line no-await-in-loop
                  result = await disableConfigEntry(this.hass, cnfg_entry);
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
                delete updates.disabled_by;
              }
            }
          }
        } else if (
          updates.disabled_by !== null &&
          updates.disabled_by !== "user"
        ) {
          delete updates.disabled_by;
        }
        try {
          await updateDeviceRegistryEntry(this.hass, this.deviceId, updates);
        } catch (err: any) {
          showAlertDialog(this, {
            title: this.hass.localize(
              "ui.panel.config.devices.update_device_error"
            ),
            text: err.message,
          });
          return;
        }

        if (
          !oldDeviceName ||
          !newDeviceName ||
          oldDeviceName === newDeviceName
        ) {
          return;
        }
        const entities = this._entities(this.deviceId, this._entityReg);

        const updateProms = entities.map((entity) => {
          const name = entity.name || entity.stateName;
          let newName: string | null | undefined;

          if (entity.has_entity_name && !entity.name) {
            return undefined;
          }

          if (
            entity.has_entity_name &&
            (entity.name === oldDeviceName || entity.name === newDeviceName)
          ) {
            // clear name if it matches the device name and it uses the device name (entity naming)
            newName = null;
          } else if (name && name.includes(oldDeviceName)) {
            newName = name.replace(oldDeviceName, newDeviceName);
          } else {
            return undefined;
          }

          return updateEntityRegistryEntry(this.hass!, entity.entity_id, {
            name: newName,
          });
        });
        await Promise.all(updateProms);
      },
    });
  };

  private async _enableDevice(): Promise<void> {
    await updateDeviceRegistryEntry(this.hass, this.deviceId, {
      disabled_by: null,
    });
  }

  private async _signUrl(ev) {
    const signedUrl = await getSignedPath(
      this.hass,
      ev.currentTarget.getAttribute("href")
    );
    fileDownload(signedUrl.path);
  }

  private _deviceActionClicked(ev) {
    if (!ev.currentTarget.action) {
      return;
    }

    ev.preventDefault();

    (ev.currentTarget as any).action(ev);
  }

  private _voiceAssistantSetup = () => {
    showVoiceAssistantSetupDialog(this, {
      deviceId: this.deviceId,
    });
  };

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

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 12px;
        }

        .card-header ha-icon-button {
          margin-right: -8px;
          margin-inline-end: -8px;
          margin-inline-start: initial;
          color: var(--primary-color);
          height: auto;
          direction: var(--direction);
        }

        .device-info {
          padding: 16px;
        }

        h1 {
          margin: 0;
          font-family: var(--ha-font-family-body);
          -webkit-font-smoothing: var(--ha-font-smoothing);
          -moz-osx-font-smoothing: var(--ha-moz-osx-font-smoothing);
          font-size: var(--ha-font-size-2xl);
          font-weight: var(--ha-font-weight-normal);
          line-height: var(--ha-line-height-condensed);
          opacity: var(--dark-primary-opacity);
        }

        .header {
          display: flex;
          justify-content: space-between;
        }

        .header-name {
          display: flex;
          align-items: center;
          padding-left: 8px;
          padding-inline-start: 8px;
          padding-inline-end: initial;
          direction: var(--direction);
        }

        .column,
        .fullwidth {
          padding: 8px;
          box-sizing: border-box;
        }
        .column {
          width: 33%;
          flex-grow: 1;
        }
        .fullwidth {
          width: 100%;
          flex-grow: 1;
        }

        .header-right {
          align-self: center;
        }

        .header-right img {
          height: 30px;
        }

        .header-right {
          display: flex;
        }

        .header-right:first-child {
          width: 100%;
          justify-content: flex-end;
        }

        .header-right > *:not(:first-child) {
          margin-left: 16px;
          margin-inline-start: 16px;
          margin-inline-end: initial;
          direction: var(--direction);
        }

        .battery {
          align-self: center;
          align-items: center;
          display: flex;
          white-space: nowrap;
        }

        .column > *:not(:first-child) {
          margin-top: 16px;
        }

        :host([narrow]) .column {
          width: 100%;
        }

        :host([narrow]) .container {
          margin-top: 0;
        }

        a {
          text-decoration: none;
          color: var(--primary-color);
        }

        ha-card a {
          color: var(--primary-text-color);
        }

        ha-svg-icon[slot="trailingIcon"] {
          display: block;
          width: 18px;
          height: 18px;
          margin-inline-start: 8px;
          margin-inline-end: initial;
        }

        ha-svg-icon[slot="meta"] {
          width: 18px;
          height: 18px;
        }

        .items {
          padding-bottom: 16px;
        }

        ha-card:has(ha-logbook) {
          padding-bottom: var(--ha-card-border-radius, 12px);
        }

        ha-logbook {
          height: 400px;
        }
        :host([narrow]) ha-logbook {
          height: 235px;
        }

        .card-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 16px 4px 4px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-config-device-page": HaConfigDevicePage;
  }
}
