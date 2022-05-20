import { mdiOpenInNew, mdiPencil, mdiPlusCircle } from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ifDefined } from "lit/directives/if-defined";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../common/config/is_component_loaded";
import { computeDomain } from "../../../common/entity/compute_domain";
import { computeStateDomain } from "../../../common/entity/compute_state_domain";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { stringCompare } from "../../../common/string/compare";
import { slugify } from "../../../common/string/slugify";
import { groupBy } from "../../../common/util/group-by";
import "../../../components/entity/ha-battery-icon";
import "../../../components/ha-alert";
import "../../../components/ha-icon-button";
import "../../../components/ha-icon-next";
import "../../../components/ha-svg-icon";
import { AreaRegistryEntry } from "../../../data/area_registry";
import { getSignedPath } from "../../../data/auth";
import {
  ConfigEntry,
  disableConfigEntry,
  DisableConfigEntryResult,
} from "../../../data/config_entries";
import {
  computeDeviceName,
  DeviceRegistryEntry,
  updateDeviceRegistryEntry,
  removeConfigEntryFromDevice,
} from "../../../data/device_registry";
import {
  fetchDiagnosticHandler,
  getDeviceDiagnosticsDownloadUrl,
  getConfigEntryDiagnosticsDownloadUrl,
  DiagnosticInfo,
} from "../../../data/diagnostics";
import {
  EntityRegistryEntry,
  findBatteryChargingEntity,
  findBatteryEntity,
  updateEntityRegistryEntry,
} from "../../../data/entity_registry";
import { domainToName } from "../../../data/integration";
import { SceneEntities, showSceneEditor } from "../../../data/scene";
import { findRelated, RelatedResult } from "../../../data/search";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../dialogs/generic/show-dialog-box";
import "../../../layouts/hass-error-screen";
import "../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../resources/styles";
import { HomeAssistant, Route } from "../../../types";
import { brandsUrl } from "../../../util/brands-url";
import { fileDownload } from "../../../util/file_download";
import "../ha-config-section";
import { configSections } from "../ha-panel-config";
import "./device-detail/ha-device-entities-card";
import "./device-detail/ha-device-info-card";
import { showDeviceAutomationDialog } from "./device-detail/show-dialog-device-automation";
import {
  loadDeviceRegistryDetailDialog,
  showDeviceRegistryDetailDialog,
} from "./device-registry-detail/show-dialog-device-registry-detail";
import "../../logbook/ha-logbook";

export interface EntityRegistryStateEntry extends EntityRegistryEntry {
  stateName?: string | null;
}

@customElement("ha-config-device-page")
export class HaConfigDevicePage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public devices!: DeviceRegistryEntry[];

  @property() public entries!: ConfigEntry[];

  @property() public entities!: EntityRegistryEntry[];

  @property() public areas!: AreaRegistryEntry[];

  @property() public deviceId!: string;

  @property({ type: Boolean, reflect: true }) public narrow!: boolean;

  @property() public isWide!: boolean;

  @property() public showAdvanced!: boolean;

  @property() public route!: Route;

  @state() private _related?: RelatedResult;

  // If a number, it's the request ID so we make sure we don't show older info
  @state() private _diagnosticDownloadLinks?:
    | number
    | (TemplateResult | string)[];

  @state() private _deleteButtons?: (TemplateResult | string)[];

  private _logbookTime = { recent: 86400 };

  private _device = memoizeOne(
    (
      deviceId: string,
      devices: DeviceRegistryEntry[]
    ): DeviceRegistryEntry | undefined =>
      devices ? devices.find((device) => device.id === deviceId) : undefined
  );

  private _integrations = memoizeOne(
    (device: DeviceRegistryEntry, entries: ConfigEntry[]): ConfigEntry[] =>
      entries.filter((entry) => device.config_entries.includes(entry.entry_id))
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
            ent2.stateName || `zzz${ent2.entity_id}`
          )
        )
  );

  private _deviceIdInList = memoizeOne((deviceId: string) => [deviceId]);

  private _entityIds = memoizeOne(
    (entries: EntityRegistryStateEntry[]): string[] =>
      entries.map((entry) => entry.entity_id)
  );

  private _entitiesByCategory = memoizeOne(
    (entities: EntityRegistryEntry[]) => {
      const result = groupBy(entities, (entry) =>
        entry.entity_category
          ? entry.entity_category
          : [
              "sensor",
              "binary_sensor",
              "camera",
              "device_tracker",
              "weather",
            ].includes(computeDomain(entry.entity_id))
          ? "sensor"
          : "control"
      ) as Record<
        | "control"
        | "sensor"
        | NonNullable<EntityRegistryEntry["entity_category"]>,
        EntityRegistryStateEntry[]
      >;
      for (const key of ["control", "sensor", "diagnostic", "config"]) {
        if (!(key in result)) {
          result[key] = [];
        }
      }

      return result;
    }
  );

  private _computeArea = memoizeOne(
    (areas, device): AreaRegistryEntry | undefined => {
      if (!areas || !device || !device.area_id) {
        return undefined;
      }
      return areas.find((area) => area.area_id === device.area_id);
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

  public willUpdate(changedProps) {
    super.willUpdate(changedProps);

    if (
      changedProps.has("deviceId") ||
      changedProps.has("devices") ||
      changedProps.has("deviceId") ||
      changedProps.has("entries")
    ) {
      this._diagnosticDownloadLinks = undefined;
      this._deleteButtons = undefined;
    }

    if (
      (this._diagnosticDownloadLinks && this._deleteButtons) ||
      !this.devices ||
      !this.deviceId ||
      !this.entries
    ) {
      return;
    }

    this._diagnosticDownloadLinks = Math.random();
    this._deleteButtons = []; // To prevent re-rendering if no delete buttons
    this._renderDiagnosticButtons(this._diagnosticDownloadLinks);
    this._renderDeleteButtons();
  }

  private async _renderDiagnosticButtons(requestId: number): Promise<void> {
    if (!isComponentLoaded(this.hass, "diagnostics")) {
      return;
    }

    const device = this._device(this.deviceId, this.devices);

    if (!device) {
      return;
    }

    let links = await Promise.all(
      this._integrations(device, this.entries).map(
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

    if (this._diagnosticDownloadLinks !== requestId) {
      return;
    }
    if (links.length > 0) {
      this._diagnosticDownloadLinks = (
        links as { link: string; domain: string }[]
      ).map(
        (link) => html`
          <a href=${link.link} @click=${this._signUrl}>
            <mwc-button>
              ${links.length > 1
                ? this.hass.localize(
                    `ui.panel.config.devices.download_diagnostics_integration`,
                    {
                      integration: domainToName(
                        this.hass.localize,
                        link.domain
                      ),
                    }
                  )
                : this.hass.localize(
                    `ui.panel.config.devices.download_diagnostics`
                  )}
            </mwc-button>
          </a>
        `
      );
    }
  }

  private _renderDeleteButtons() {
    const device = this._device(this.deviceId, this.devices);

    if (!device) {
      return;
    }

    const buttons: TemplateResult[] = [];
    this._integrations(device, this.entries).forEach((entry) => {
      if (entry.state !== "loaded" || !entry.supports_remove_device) {
        return;
      }
      buttons.push(html`
        <mwc-button
          class="warning"
          .entryId=${entry.entry_id}
          @click=${this._confirmDeleteEntry}
        >
          ${buttons.length > 1
            ? this.hass.localize(
                `ui.panel.config.devices.delete_device_integration`,
                {
                  integration: domainToName(this.hass.localize, entry.domain),
                }
              )
            : this.hass.localize(`ui.panel.config.devices.delete_device`)}
        </mwc-button>
      `);
    });

    if (buttons.length > 0) {
      this._deleteButtons = buttons;
    }
  }

  private async _confirmDeleteEntry(e: MouseEvent): Promise<void> {
    const entryId = (e.currentTarget as any).entryId;

    const confirmed = await showConfirmationDialog(this, {
      text: this.hass.localize("ui.panel.config.devices.confirm_delete"),
    });

    if (!confirmed) {
      return;
    }

    await removeConfigEntryFromDevice(this.hass!, this.deviceId, entryId);
  }

  protected firstUpdated(changedProps) {
    super.firstUpdated(changedProps);
    loadDeviceRegistryDetailDialog();
  }

  protected updated(changedProps) {
    super.updated(changedProps);
    if (changedProps.has("deviceId")) {
      this._findRelated();
    }
  }

  protected render() {
    const device = this._device(this.deviceId, this.devices);

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

    const deviceName = computeDeviceName(device, this.hass);
    const integrations = this._integrations(device, this.entries);
    const entities = this._entities(this.deviceId, this.entities);
    const entitiesByCategory = this._entitiesByCategory(entities);
    const batteryEntity = this._batteryEntity(entities);
    const batteryChargingEntity = this._batteryChargingEntity(entities);
    const batteryState = batteryEntity
      ? this.hass.states[batteryEntity.entity_id]
      : undefined;
    const batteryIsBinary =
      batteryState && computeStateDomain(batteryState) === "binary_sensor";
    const batteryChargingState = batteryChargingEntity
      ? this.hass.states[batteryChargingEntity.entity_id]
      : undefined;
    const area = this._computeArea(this.areas, device);

    const configurationUrlIsHomeAssistant =
      device.configuration_url?.startsWith("homeassistant://") || false;

    const configurationUrl = configurationUrlIsHomeAssistant
      ? device.configuration_url!.replace("homeassistant://", "/")
      : device.configuration_url;

    const deviceInfo: TemplateResult[] = [];

    if (device.disabled_by) {
      deviceInfo.push(
        html`
          <ha-alert alert-type="warning">
            ${this.hass.localize(
              "ui.panel.config.devices.enabled_cause",
              "type",
              this.hass.localize(
                `ui.panel.config.devices.type.${device.entry_type || "device"}`
              ),
              "cause",
              this.hass.localize(
                `ui.panel.config.devices.disabled_by.${device.disabled_by}`
              )
            )}
          </ha-alert>
          ${device.disabled_by === "user"
            ? html` <div class="card-actions" slot="actions">
                <mwc-button unelevated @click=${this._enableDevice}>
                  ${this.hass.localize("ui.common.enable")}
                </mwc-button>
              </div>`
            : ""}
        `
      );
    }

    const deviceActions: (TemplateResult | string)[] = [];

    if (configurationUrl) {
      deviceActions.push(html`
        <a
          href=${configurationUrl}
          rel="noopener noreferrer"
          .target=${configurationUrlIsHomeAssistant ? "_self" : "_blank"}
        >
          <mwc-button>
            ${this.hass.localize(
              `ui.panel.config.devices.open_configuration_url_${
                device.entry_type || "device"
              }`
            )}
            <ha-svg-icon
              .path=${mdiOpenInNew}
              slot="trailingIcon"
            ></ha-svg-icon>
          </mwc-button>
        </a>
      `);
    }

    this._renderIntegrationInfo(
      device,
      integrations,
      deviceInfo,
      deviceActions
    );

    if (Array.isArray(this._diagnosticDownloadLinks)) {
      deviceActions.push(...this._diagnosticDownloadLinks);
    }
    if (this._deleteButtons) {
      deviceActions.push(...this._deleteButtons);
    }

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .tabs=${configSections.devices}
        .route=${this.route}
      >
        ${
          this.narrow
            ? html`
                <span slot="header">${deviceName}</span>
                <ha-icon-button
                  slot="toolbar-icon"
                  .path=${mdiPencil}
                  @click=${this._showSettings}
                  .label=${this.hass.localize(
                    "ui.panel.config.devices.edit_settings"
                  )}
                ></ha-icon-button>
              `
            : ""
        }




        <div class="container">
          <div class="header fullwidth">
            ${
              this.narrow
                ? ""
                : html`
                    <div class="header-name">
                      <div>
                        <h1>${deviceName}</h1>
                        ${area
                          ? html`
                              <a href="/config/areas/area/${area.area_id}"
                                >${this.hass.localize(
                                  "ui.panel.config.integrations.config_entry.area",
                                  "area",
                                  area.name || "Unnamed Area"
                                )}</a
                              >
                            `
                          : ""}
                      </div>
                      <ha-icon-button
                        .path=${mdiPencil}
                        @click=${this._showSettings}
                        .label=${this.hass.localize(
                          "ui.panel.config.devices.edit_settings"
                        )}
                      ></ha-icon-button>
                    </div>
                  `
            }
                <div class="header-right">
                  ${
                    batteryState
                      ? html`
                          <div class="battery">
                            ${batteryIsBinary ? "" : batteryState.state + " %"}
                            <ha-battery-icon
                              .hass=${this.hass!}
                              .batteryStateObj=${batteryState}
                              .batteryChargingStateObj=${batteryChargingState}
                            ></ha-battery-icon>
                          </div>
                        `
                      : ""
                  }
                  ${
                    integrations.length
                      ? html`
                          <img
                            src=${brandsUrl({
                              domain: integrations[0].domain,
                              type: "logo",
                              darkOptimized: this.hass.themes?.darkMode,
                            })}
                            referrerpolicy="no-referrer"
                            @load=${this._onImageLoad}
                            @error=${this._onImageError}
                          />
                        `
                      : ""
                  }

                </div>
          </div>
          <div class="column">
              <ha-device-info-card
                .hass=${this.hass}
                .areas=${this.areas}
                .devices=${this.devices}
                .device=${device}
              >
                ${deviceInfo}
                ${
                  deviceActions.length
                    ? html`
                        <div class="card-actions" slot="actions">
                          ${deviceActions}
                        </div>
                      `
                    : ""
                }
              </ha-device-info-card>
          </div>
          <div class="column">
            ${["control", "sensor", "config", "diagnostic"].map((category) =>
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
            ${
              isComponentLoaded(this.hass, "logbook")
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
                : ""
            }
          </div>
          <div class="column">
            ${
              isComponentLoaded(this.hass, "automation")
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
                                "ui.panel.config.devices.automation.create_disabled",
                                "type",
                                this.hass.localize(
                                  `ui.panel.config.devices.type.${
                                    device.entry_type || "device"
                                  }`
                                )
                              )
                            : this.hass.localize(
                                "ui.panel.config.devices.automation.create",
                                "type",
                                this.hass.localize(
                                  `ui.panel.config.devices.type.${
                                    device.entry_type || "device"
                                  }`
                                )
                              )}
                          .path=${mdiPlusCircle}
                        ></ha-icon-button>
                      </h1>
                      ${this._related?.automation?.length
                        ? html`
                            <div class="items">
                              ${this._related.automation.map((automation) => {
                                const entityState =
                                  this.hass.states[automation];
                                return entityState
                                  ? html`<div>
                                      <a
                                        href=${ifDefined(
                                          entityState.attributes.id
                                            ? `/config/automation/edit/${entityState.attributes.id}`
                                            : undefined
                                        )}
                                      >
                                        <paper-item
                                          .automation=${entityState}
                                          .disabled=${!entityState.attributes
                                            .id}
                                        >
                                          <paper-item-body>
                                            ${computeStateName(entityState)}
                                          </paper-item-body>
                                          <ha-icon-next></ha-icon-next>
                                        </paper-item>
                                      </a>
                                      ${!entityState.attributes.id
                                        ? html`
                                            <paper-tooltip animation-delay="0">
                                              ${this.hass.localize(
                                                "ui.panel.config.devices.cant_edit"
                                              )}
                                            </paper-tooltip>
                                          `
                                        : ""}
                                    </div> `
                                  : "";
                              })}
                            </div>
                          `
                        : html`
                            <div class="card-content">
                              ${this.hass.localize(
                                "ui.panel.config.devices.add_prompt",
                                "name",
                                this.hass.localize(
                                  "ui.panel.config.devices.automation.automations"
                                ),
                                "type",
                                this.hass.localize(
                                  `ui.panel.config.devices.type.${
                                    device.entry_type || "device"
                                  }`
                                )
                              )}
                            </div>
                          `}
                    </ha-card>
                  `
                : ""
            }
            ${
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
                                "ui.panel.config.devices.scene.create_disabled",
                                "type",
                                this.hass.localize(
                                  `ui.panel.config.devices.type.${
                                    device.entry_type || "device"
                                  }`
                                )
                              )
                            : this.hass.localize(
                                "ui.panel.config.devices.scene.create",
                                "type",
                                this.hass.localize(
                                  `ui.panel.config.devices.type.${
                                    device.entry_type || "device"
                                  }`
                                )
                              )}
                          .path=${mdiPlusCircle}
                        ></ha-icon-button>
                      </h1>
                      ${this._related?.scene?.length
                        ? html`
                            <div class="items">
                              ${this._related.scene.map((scene) => {
                                const entityState = this.hass.states[scene];
                                return entityState
                                  ? html`
                                      <div>
                                        <a
                                          href=${ifDefined(
                                            entityState.attributes.id
                                              ? `/config/scene/edit/${entityState.attributes.id}`
                                              : undefined
                                          )}
                                        >
                                          <paper-item
                                            .scene=${entityState}
                                            .disabled=${!entityState.attributes
                                              .id}
                                          >
                                            <paper-item-body>
                                              ${computeStateName(entityState)}
                                            </paper-item-body>
                                            <ha-icon-next></ha-icon-next>
                                          </paper-item>
                                        </a>
                                        ${!entityState.attributes.id
                                          ? html`
                                              <paper-tooltip
                                                animation-delay="0"
                                              >
                                                ${this.hass.localize(
                                                  "ui.panel.config.devices.cant_edit"
                                                )}
                                              </paper-tooltip>
                                            `
                                          : ""}
                                      </div>
                                    `
                                  : "";
                              })}
                            </div>
                          `
                        : html`
                            <div class="card-content">
                              ${this.hass.localize(
                                "ui.panel.config.devices.add_prompt",
                                "name",
                                this.hass.localize(
                                  "ui.panel.config.devices.scene.scenes"
                                ),
                                "type",
                                this.hass.localize(
                                  `ui.panel.config.devices.type.${
                                    device.entry_type || "device"
                                  }`
                                )
                              )}
                            </div>
                          `}
                    </ha-card>
                  `
                : ""
            }
              ${
                isComponentLoaded(this.hass, "script")
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
                                  "ui.panel.config.devices.script.create_disabled",
                                  "type",
                                  this.hass.localize(
                                    `ui.panel.config.devices.type.${
                                      device.entry_type || "device"
                                    }`
                                  )
                                )
                              : this.hass.localize(
                                  "ui.panel.config.devices.script.create",
                                  "type",
                                  this.hass.localize(
                                    `ui.panel.config.devices.type.${
                                      device.entry_type || "device"
                                    }`
                                  )
                                )}
                            .path=${mdiPlusCircle}
                          ></ha-icon-button>
                        </h1>
                        ${this._related?.script?.length
                          ? html`
                              <div class="items">
                                ${this._related.script.map((script) => {
                                  const entityState = this.hass.states[script];
                                  return entityState
                                    ? html`
                                        <a
                                          href=${`/config/script/edit/${entityState.entity_id}`}
                                        >
                                          <paper-item .script=${script}>
                                            <paper-item-body>
                                              ${computeStateName(entityState)}
                                            </paper-item-body>
                                            <ha-icon-next></ha-icon-next>
                                          </paper-item>
                                        </a>
                                      `
                                    : "";
                                })}
                              </div>
                            `
                          : html`
                              <div class="card-content">
                                ${this.hass.localize(
                                  "ui.panel.config.devices.add_prompt",
                                  "name",
                                  this.hass.localize(
                                    "ui.panel.config.devices.script.scripts"
                                  ),
                                  "type",
                                  this.hass.localize(
                                    `ui.panel.config.devices.type.${
                                      device.entry_type || "device"
                                    }`
                                  )
                                )}
                              </div>
                            `}
                      </ha-card>
                    `
                  : ""
              }
            </div>
          </div>
        </ha-config-section>
      </hass-tabs-subpage>    `;
  }

  private _computeEntityName(entity: EntityRegistryEntry) {
    if (entity.name) {
      return entity.name;
    }
    const entityState = this.hass.states[entity.entity_id];
    return entityState ? computeStateName(entityState) : null;
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
    this._entities(this.deviceId, this.entities).forEach((entity) => {
      entities[entity.entity_id] = "";
    });
    showSceneEditor({
      entities,
    });
  }

  private _showScriptDialog() {
    showDeviceAutomationDialog(this, {
      device: this._device(this.deviceId, this.devices)!,
      script: true,
    });
  }

  private _showAutomationDialog() {
    showDeviceAutomationDialog(this, {
      device: this._device(this.deviceId, this.devices)!,
      script: false,
    });
  }

  private _renderIntegrationInfo(
    device: DeviceRegistryEntry,
    integrations: ConfigEntry[],
    deviceInfo: TemplateResult[],
    deviceActions: (string | TemplateResult)[]
  ) {
    const domains = integrations.map((int) => int.domain);
    if (domains.includes("mqtt")) {
      import(
        "./device-detail/integration-elements/mqtt/ha-device-actions-mqtt"
      );
      deviceActions.push(html`
        <ha-device-actions-mqtt
          .hass=${this.hass}
          .device=${device}
        ></ha-device-actions-mqtt>
      `);
    }
    if (domains.includes("zha")) {
      import("./device-detail/integration-elements/zha/ha-device-actions-zha");
      import("./device-detail/integration-elements/zha/ha-device-info-zha");
      deviceInfo.push(html`
        <ha-device-info-zha
          .hass=${this.hass}
          .device=${device}
        ></ha-device-info-zha>
      `);
      deviceActions.push(html`
        <ha-device-actions-zha
          .hass=${this.hass}
          .device=${device}
        ></ha-device-actions-zha>
      `);
    }
    if (domains.includes("zwave_js")) {
      import(
        "./device-detail/integration-elements/zwave_js/ha-device-info-zwave_js"
      );
      import(
        "./device-detail/integration-elements/zwave_js/ha-device-actions-zwave_js"
      );
      deviceInfo.push(html`
        <ha-device-info-zwave_js
          .hass=${this.hass}
          .device=${device}
        ></ha-device-info-zwave_js>
      `);
      deviceActions.push(html`
        <ha-device-actions-zwave_js
          .hass=${this.hass}
          .device=${device}
        ></ha-device-actions-zwave_js>
      `);
    }
  }

  private async _showSettings() {
    const device = this._device(this.deviceId, this.devices)!;
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
              !this.devices.some(
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
                    "ui.panel.config.devices.confirm_disable_config_entry",
                    "entry_name",
                    config_entry.title
                  ),
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
        }

        if (
          !oldDeviceName ||
          !newDeviceName ||
          oldDeviceName === newDeviceName
        ) {
          return;
        }
        const entities = this._entities(this.deviceId, this.entities);

        const renameEntityid =
          this.showAdvanced &&
          (await showConfirmationDialog(this, {
            title: this.hass.localize(
              "ui.panel.config.devices.confirm_rename_entity_ids"
            ),
            text: this.hass.localize(
              "ui.panel.config.devices.confirm_rename_entity_ids_warning"
            ),
            confirmText: this.hass.localize("ui.common.rename"),
            dismissText: this.hass.localize("ui.common.no"),
            warning: true,
          }));

        const updateProms = entities.map((entity) => {
          const name = entity.name || entity.stateName;
          let newEntityId: string | null = null;
          let newName: string | null = null;

          if (name && name.includes(oldDeviceName)) {
            newName = name.replace(oldDeviceName, newDeviceName);
          }

          if (renameEntityid) {
            const oldSearch = slugify(oldDeviceName);
            if (entity.entity_id.includes(oldSearch)) {
              newEntityId = entity.entity_id.replace(
                oldSearch,
                slugify(newDeviceName)
              );
            }
          }

          if (!newName && !newEntityId) {
            return undefined;
          }

          return updateEntityRegistryEntry(this.hass!, entity.entity_id, {
            name: newName || name,
            new_entity_id: newEntityId || entity.entity_id,
          });
        });
        await Promise.all(updateProms);
      },
    });
  }

  private async _enableDevice(): Promise<void> {
    await updateDeviceRegistryEntry(this.hass, this.deviceId, {
      disabled_by: null,
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
          color: var(--primary-color);
          height: auto;
        }

        .device-info {
          padding: 16px;
        }

        .show-more {
        }

        h1 {
          margin: 0;
          font-family: var(--paper-font-headline_-_font-family);
          -webkit-font-smoothing: var(
            --paper-font-headline_-_-webkit-font-smoothing
          );
          font-size: var(--paper-font-headline_-_font-size);
          font-weight: var(--paper-font-headline_-_font-weight);
          letter-spacing: var(--paper-font-headline_-_letter-spacing);
          line-height: var(--paper-font-headline_-_line-height);
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

        paper-item {
          cursor: pointer;
          font-size: var(--paper-font-body1_-_font-size);
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
        }

        .items {
          padding-bottom: 16px;
        }

        ha-logbook {
          height: 400px;
        }
        :host([narrow]) ha-logbook {
          height: 235px;
        }
      `,
    ];
  }
}
