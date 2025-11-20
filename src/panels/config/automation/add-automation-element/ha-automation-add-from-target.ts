import "@home-assistant/webawesome/dist/components/tree-item/tree-item";
import "@home-assistant/webawesome/dist/components/tree/tree";
import type { WaSelectionChangeEvent } from "@home-assistant/webawesome/dist/events/selection-change";
import { consume } from "@lit/context";
import { mdiTextureBox } from "@mdi/js";
import type {
  HassEntity,
  SingleHassServiceTarget,
} from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeAreaName } from "../../../../common/entity/compute_area_name";
import { computeDeviceName } from "../../../../common/entity/compute_device_name";
import { computeEntityNameList } from "../../../../common/entity/compute_entity_name_display";
import "../../../../components/entity/state-badge";
import "../../../../components/ha-floor-icon";
import "../../../../components/ha-icon";
import "../../../../components/ha-icon-next";
import "../../../../components/ha-md-list";
import "../../../../components/ha-md-list-item";
import "../../../../components/ha-section-title";
import "../../../../components/ha-svg-icon";
import {
  getAreasNestedInFloors,
  type AreaFloorValue,
  type FloorComboBoxItem,
  type FloorNestedComboBoxItem,
  type UnassignedAreasFloorComboBoxItem,
} from "../../../../data/area_floor";
import {
  getAreaDeviceLookup,
  getAreaEntityLookup,
} from "../../../../data/area_registry";
import {
  getConfigEntries,
  type ConfigEntry,
} from "../../../../data/config_entries";
import {
  areasContext,
  devicesContext,
  entitiesContext,
  floorsContext,
  labelsContext,
  localizeContext,
  statesContext,
} from "../../../../data/context";
import { getDeviceEntityLookup } from "../../../../data/device_registry";
import {
  domainToName,
  type DomainManifestLookup,
} from "../../../../data/integration";
import {
  getLabels,
  type LabelRegistryEntry,
} from "../../../../data/label_registry";
import type { HomeAssistant } from "../../../../types";
import { brandsUrl } from "../../../../util/brands-url";

export const TARGET_SEPARATOR = "________";

interface Level1Entries {
  open: boolean;
  areas?: Record<string, Level2Entries>;
  devices?: Record<string, Level3Entries>;
}

interface Level2Entries {
  open: boolean;
  devices: Record<string, Level3Entries>;
  entities: string[];
}

interface Level3Entries {
  open: boolean;
  entities: string[];
}

@customElement("ha-automation-add-from-target")
export default class HaAutomationAddFromTarget extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public value?: SingleHassServiceTarget;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: false }) public manifests?: DomainManifestLookup;

  // #region context
  @state()
  @consume({ context: localizeContext, subscribe: true })
  private localize!: HomeAssistant["localize"];

  @state()
  @consume({ context: statesContext, subscribe: true })
  private states!: HomeAssistant["states"];

  @state()
  @consume({ context: floorsContext, subscribe: true })
  private floors!: HomeAssistant["floors"];

  @state()
  @consume({ context: areasContext, subscribe: true })
  private areas!: HomeAssistant["areas"];

  @state()
  @consume({ context: devicesContext, subscribe: true })
  private devices!: HomeAssistant["devices"];

  @state()
  @consume({ context: entitiesContext, subscribe: true })
  private entities!: HomeAssistant["entities"];

  @state()
  @consume({ context: labelsContext, subscribe: true })
  private _labelRegistry!: LabelRegistryEntry[];
  // #endregion context

  @state()
  private _floorAreas: (
    | FloorNestedComboBoxItem
    | UnassignedAreasFloorComboBoxItem
  )[] = [];

  @state() private _entries: Record<string, Level1Entries> = {};

  @state() private _showShowMoreButton?: boolean;

  @state() private _fullHeight = false;

  private _getLabelsMemoized = memoizeOne(getLabels);

  private _configEntryLookup: Record<string, ConfigEntry> = {};

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      this._initialDataLoad();
    }

    if (changedProps.has("value") || changedProps.has("narrow")) {
      this._fullHeight =
        !this.narrow || !this.value || !Object.values(this.value)[0];
      this.style.setProperty("--max-height", this._fullHeight ? "none" : "50%");
    }
  }

  protected updated(changedProps: PropertyValues) {
    if (
      changedProps.has("value") ||
      changedProps.has("narrow") ||
      this._showShowMoreButton === undefined
    ) {
      this._setShowTargetShowMoreButton();
    }
  }

  private async _initialDataLoad() {
    await this._loadConfigEntries();
    this._getTreeData();
  }

  // #region render

  protected render() {
    if (!this.manifests || !this._configEntryLookup) {
      return nothing;
    }

    return html`
      ${!this.narrow || !this.value ? this._renderFloors() : nothing}
      ${this.narrow && this.value ? this._renderNarrow(this.value) : nothing}
      ${!this.narrow || !this.value ? this._renderUnassigned() : nothing}
      ${!this.narrow || !this.value ? this._renderLabels() : nothing}
      ${this.narrow && this._showShowMoreButton && !this._fullHeight
        ? html`
            <div class="targets-show-more">
              <ha-button appearance="plain" @click=${this._expandHeight}>
                ${this.localize("ui.panel.config.automation.editor.show_more")}
              </ha-button>
            </div>
          `
        : nothing}
    `;
  }

  private _renderNarrow(value: SingleHassServiceTarget) {
    const [valueTypeId, valueId] = Object.entries(value)[0];
    const valueType = valueTypeId.replace("_id", "");

    if (!valueType || valueType === "label") {
      return nothing;
    }

    // floor areas, unassigned areas
    if (valueType === "floor") {
      return this._renderAreas(
        this._entries[`floor${TARGET_SEPARATOR}${valueId ?? ""}`].areas!
      );
    }

    if (valueType === "area" && valueId) {
      const floor =
        this._entries[
          `floor${TARGET_SEPARATOR}${this.areas[valueId]?.floor_id || ""}`
        ];
      const { devices, entities } =
        floor.areas![`area${TARGET_SEPARATOR}${valueId}`];
      const numberOfDevices = Object.keys(devices).length;

      return html`
        ${numberOfDevices ? this._renderDevices(devices) : nothing}
        ${entities.length ? this._renderEntities(entities) : nothing}
      `;
    }

    if ((!valueId && valueType === "area") || valueType === "service") {
      const floor = this._entries[`${valueType}${TARGET_SEPARATOR}`];
      const devices = floor.devices!;

      return this._renderDevices(devices);
    }

    if (valueId && valueType === "device") {
      const areaId = this.devices[valueId]?.area_id;
      if (areaId) {
        const floorId = this.areas[areaId]?.floor_id || "";
        const { entities } =
          this._entries[`floor${TARGET_SEPARATOR}${floorId}`].areas![
            `area${TARGET_SEPARATOR}${areaId}`
          ].devices![valueId];

        return entities.length ? this._renderEntities(entities) : nothing;
      }

      const device = this.devices[valueId];
      const isService = device.entry_type === "service";
      const { entities } =
        this._entries[`${isService ? "service" : "area"}${TARGET_SEPARATOR}`]
          .devices![valueId];
      return entities.length ? this._renderEntities(entities) : nothing;
    }

    if (valueType === "device" || valueType === "helper") {
      const { devices } = this._entries[`${valueType}${TARGET_SEPARATOR}`];
      return this._renderDomains(
        devices!,
        valueType === "device" ? "entity_" : "helper_"
      );
    }

    if (
      !valueId &&
      (valueType.startsWith("entity") || valueType.startsWith("helper"))
    ) {
      const { entities } =
        this._entries[
          `${valueType.startsWith("entity") ? "device" : "helper"}${TARGET_SEPARATOR}`
        ].devices![`${valueType}${TARGET_SEPARATOR}`];
      return this._renderEntities(entities);
    }

    return nothing;
  }

  private _renderFloors() {
    return html`<ha-section-title
        >${this.localize(
          "ui.panel.config.automation.editor.home"
        )}</ha-section-title
      >
      ${!this._floorAreas.length ||
      (!this._floorAreas[0].id && !this._floorAreas[0].areas.length)
        ? html`<ha-md-list>
            <ha-md-list-item type="text">
              <div slot="headline">
                ${this.localize("ui.components.area-picker.no_areas")}
              </div>
            </ha-md-list-item>
          </ha-md-list>`
        : this.narrow
          ? html`<ha-md-list>
              ${this._floorAreas.map((floor, index) =>
                index === 0 && !floor.id
                  ? this._renderAreas(
                      this._entries[floor.id || `floor${TARGET_SEPARATOR}`]
                        .areas!
                    )
                  : html`<ha-md-list-item
                      interactive
                      type="button"
                      .target=${floor.id || `floor${TARGET_SEPARATOR}`}
                      @click=${this._selectItem}
                    >
                      ${floor.id && (floor as FloorNestedComboBoxItem).floor
                        ? html`<ha-floor-icon
                            slot="start"
                            .floor=${(floor as FloorNestedComboBoxItem).floor}
                          ></ha-floor-icon>`
                        : html`<ha-svg-icon
                            slot="start"
                            .path=${mdiTextureBox}
                          ></ha-svg-icon>`}

                      <div slot="headline">
                        ${!floor.id
                          ? this.localize(
                              "ui.panel.config.automation.editor.other_areas"
                            )
                          : floor.primary}
                      </div>
                      <ha-icon-next slot="end"></ha-icon-next>
                    </ha-md-list-item>`
              )}
            </ha-md-list>`
          : html`<wa-tree @wa-selection-change=${this._handleSelectionChange}>
              ${this._floorAreas.map((floor, index) =>
                index === 0 && !floor.id
                  ? this._renderAreas(
                      this._entries[floor.id || `floor${TARGET_SEPARATOR}`]
                        .areas!
                    )
                  : html`<wa-tree-item
                      .preventSelection=${!floor.id}
                      .target=${floor.id || `floor${TARGET_SEPARATOR}`}
                      .selected=${!!floor.id &&
                      this._getSelectedTargetId(this.value) === floor.id}
                      .lazy=${!this._entries[
                        floor.id || `floor${TARGET_SEPARATOR}`
                      ].open &&
                      !!Object.keys(
                        this._entries[floor.id || `floor${TARGET_SEPARATOR}`]
                          .areas!
                      ).length}
                      @wa-lazy-load=${this._expandItem}
                      @wa-collapse=${this._collapseItem}
                      .expanded=${this._entries[
                        floor.id || `floor${TARGET_SEPARATOR}`
                      ].open}
                    >
                      ${floor.id && (floor as FloorNestedComboBoxItem).floor
                        ? html`<ha-floor-icon
                            .floor=${(floor as FloorNestedComboBoxItem).floor}
                          ></ha-floor-icon>`
                        : html`<ha-svg-icon
                            .path=${mdiTextureBox}
                          ></ha-svg-icon>`}
                      ${!floor.id
                        ? this.localize(
                            "ui.panel.config.automation.editor.other_areas"
                          )
                        : floor.primary}
                      ${this._entries[floor.id || `floor${TARGET_SEPARATOR}`]
                        .open
                        ? this._renderAreas(
                            this._entries[
                              floor.id || `floor${TARGET_SEPARATOR}`
                            ].areas!
                          )
                        : nothing}
                    </wa-tree-item>`
              )}
            </wa-tree>`}`;
  }

  private _renderLabels() {
    const labels = this._getLabelsMemoized(
      this.states,
      this.areas,
      this.devices,
      this.entities,
      this._labelRegistry,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      `label${TARGET_SEPARATOR}`
    );

    if (!labels.length) {
      return nothing;
    }

    return html`<ha-section-title
        >${this.localize("ui.components.label-picker.labels")}</ha-section-title
      >
      <ha-md-list>
        ${labels.map(
          (label) =>
            html`<ha-md-list-item
              interactive
              type="button"
              .target=${label.id}
              @click=${this._selectItem}
              class=${this._getSelectedTargetId(this.value) === label.id
                ? "selected"
                : ""}
              >${label.icon
                ? html`<ha-icon slot="start" .icon=${label.icon}></ha-icon>`
                : label.icon_path
                  ? html`<ha-svg-icon
                      slot="start"
                      .path=${label.icon_path}
                    ></ha-svg-icon>`
                  : nothing}
              <div slot="headline">${label.primary}</div>
              ${this.narrow
                ? html`<ha-icon-next slot="end"></ha-icon-next> `
                : nothing}
            </ha-md-list-item>`
        )}
      </ha-md-list>`;
  }

  private _renderUnassigned() {
    const unassignedDevicesLength = Object.keys(
      this._entries[`area${TARGET_SEPARATOR}`]?.devices || {}
    ).length;
    const unassignedServicesLength = Object.keys(
      this._entries[`service${TARGET_SEPARATOR}`]?.devices || {}
    ).length;
    const unassignedEntitiesLength = Object.keys(
      this._entries[`device${TARGET_SEPARATOR}`]?.devices || {}
    ).length;
    const unassignedHelpersLength = Object.keys(
      this._entries[`helper${TARGET_SEPARATOR}`]?.devices || {}
    ).length;

    if (
      !unassignedDevicesLength &&
      !unassignedServicesLength &&
      !unassignedEntitiesLength &&
      !unassignedHelpersLength
    ) {
      return nothing;
    }

    return html`<ha-section-title
        >${this.localize(
          "ui.panel.config.automation.editor.unassigned"
        )}</ha-section-title
      >${this.narrow
        ? html`<ha-md-list>
            ${unassignedEntitiesLength
              ? html`<ha-md-list-item
                  interactive
                  type="button"
                  .target=${`device${TARGET_SEPARATOR}`}
                  @click=${this._selectItem}
                >
                  <div slot="headline">
                    ${this.localize(
                      "ui.components.target-picker.type.entities"
                    )}
                  </div>
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-list-item>`
              : nothing}
            ${unassignedHelpersLength
              ? html`<ha-md-list-item
                  interactive
                  type="button"
                  .target=${`helper${TARGET_SEPARATOR}`}
                  @click=${this._selectItem}
                >
                  <div slot="headline">
                    ${this.localize(
                      "ui.panel.config.automation.editor.helpers"
                    )}
                  </div>
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-list-item>`
              : nothing}
            ${unassignedDevicesLength
              ? html`<ha-md-list-item
                  interactive
                  type="button"
                  .target=${`area${TARGET_SEPARATOR}`}
                  @click=${this._selectItem}
                >
                  <div slot="headline">
                    ${this.localize("ui.components.target-picker.type.devices")}
                  </div>
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-list-item>`
              : nothing}
            ${unassignedServicesLength
              ? html`<ha-md-list-item
                  interactive
                  type="button"
                  .target=${`service${TARGET_SEPARATOR}`}
                  @click=${this._selectItem}
                >
                  <div slot="headline">
                    ${this.localize(
                      "ui.panel.config.automation.editor.services"
                    )}
                  </div>
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-list-item>`
              : nothing}
          </ha-md-list>`
        : html`<wa-tree @wa-selection-change=${this._handleSelectionChange}>
            ${unassignedEntitiesLength
              ? html`<wa-tree-item
                  .lazy=${!this._entries[`device${TARGET_SEPARATOR}`].open}
                  .target=${`device${TARGET_SEPARATOR}`}
                  @wa-lazy-load=${this._expandItem}
                  @wa-collapse=${this._collapseItem}
                  prevent-selection
                  .expanded=${this._entries[`device${TARGET_SEPARATOR}`].open}
                >
                  ${this.localize("ui.components.target-picker.type.entities")}
                  ${this._entries[`device${TARGET_SEPARATOR}`].open
                    ? this._renderDomains(
                        this._entries[`device${TARGET_SEPARATOR}`].devices!,
                        "entity_"
                      )
                    : nothing}
                </wa-tree-item>`
              : nothing}
            ${unassignedHelpersLength
              ? html`<wa-tree-item
                  .lazy=${!this._entries[`helper${TARGET_SEPARATOR}`].open}
                  .expanded=${this._entries[`helper${TARGET_SEPARATOR}`].open}
                  .target=${`helper${TARGET_SEPARATOR}`}
                  @wa-lazy-load=${this._expandItem}
                  @wa-collapse=${this._collapseItem}
                  prevent-selection
                >
                  ${this.localize("ui.panel.config.automation.editor.helpers")}
                  ${this._entries[`helper${TARGET_SEPARATOR}`].open
                    ? this._renderDomains(
                        this._entries[`helper${TARGET_SEPARATOR}`].devices!,
                        "helper_"
                      )
                    : nothing}
                </wa-tree-item>`
              : nothing}
            ${unassignedDevicesLength
              ? html`<wa-tree-item
                  .lazy=${!this._entries[`area${TARGET_SEPARATOR}`].open}
                  .expanded=${this._entries[`area${TARGET_SEPARATOR}`].open}
                  .target=${`area${TARGET_SEPARATOR}`}
                  @wa-lazy-load=${this._expandItem}
                  @wa-collapse=${this._collapseItem}
                  prevent-selection
                >
                  ${this.localize("ui.components.target-picker.type.devices")}
                  ${this._entries[`area${TARGET_SEPARATOR}`].open
                    ? this._renderDevices(
                        this._entries[`area${TARGET_SEPARATOR}`].devices!
                      )
                    : nothing}
                </wa-tree-item>`
              : nothing}
            ${unassignedServicesLength
              ? html`<wa-tree-item
                  .lazy=${!this._entries[`service${TARGET_SEPARATOR}`].open}
                  .expanded=${this._entries[`service${TARGET_SEPARATOR}`].open}
                  .target=${`service${TARGET_SEPARATOR}`}
                  @wa-lazy-load=${this._expandItem}
                  @wa-collapse=${this._collapseItem}
                  prevent-selection
                >
                  ${this.localize("ui.panel.config.automation.editor.services")}
                  ${this._entries[`service${TARGET_SEPARATOR}`].open
                    ? this._renderDevices(
                        this._entries[`service${TARGET_SEPARATOR}`].devices!
                      )
                    : nothing}
                </wa-tree-item>`
              : nothing}
          </wa-tree>`} `;
  }

  private _renderAreas(areas: Record<string, Level2Entries>) {
    const renderedAreas = Object.keys(areas)
      .filter((areaTargetId) => {
        const [, areaId] = areaTargetId.split(TARGET_SEPARATOR, 2);
        return this.areas[areaId];
      })
      .map((areaTargetId) => {
        const [, areaId] = areaTargetId.split(TARGET_SEPARATOR, 2);
        const area = this.areas[areaId];
        return [
          areaTargetId,
          computeAreaName(area) || area.area_id,
          area.floor_id || undefined,
          area.icon,
        ] as [string, string, string | undefined, string | undefined];
      })
      .sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB))
      .map(([areaTargetId, areaName, floorId, areaIcon]) => {
        if (this.narrow) {
          return html`<ha-md-list-item
            interactive
            type="button"
            .target=${areaTargetId}
            @click=${this._selectItem}
          >
            ${areaIcon
              ? html`<ha-icon slot="start" .icon=${areaIcon}></ha-icon>`
              : html`<ha-svg-icon
                  slot="start"
                  .path=${mdiTextureBox}
                ></ha-svg-icon>`}

            <div slot="headline">${areaName}</div>
            <ha-icon-next slot="end"></ha-icon-next>
          </ha-md-list-item>`;
        }

        const { open, devices, entities } =
          this._entries[`floor${TARGET_SEPARATOR}${floorId || ""}`].areas![
            areaTargetId
          ];
        const numberOfDevices = Object.keys(devices).length;
        const numberOfItems = numberOfDevices + entities.length;

        return html`<wa-tree-item
          .target=${areaTargetId}
          .selected=${this._getSelectedTargetId(this.value) === areaTargetId}
          .lazy=${!open && !!numberOfItems}
          .expanded=${open}
          @wa-lazy-load=${this._expandItem}
          @wa-collapse=${this._collapseItem}
        >
          ${areaIcon
            ? html`<ha-icon .icon=${areaIcon}></ha-icon>`
            : html`<ha-svg-icon .path=${mdiTextureBox}></ha-svg-icon>`}
          ${areaName}
          ${open
            ? html`
                ${numberOfDevices ? this._renderDevices(devices) : nothing}
                ${entities.length ? this._renderEntities(entities) : nothing}
              `
            : nothing}
        </wa-tree-item>`;
      });

    if (this.narrow) {
      return html`<ha-section-title
          >${this.localize(
            "ui.components.target-picker.type.areas"
          )}</ha-section-title
        >
        <ha-md-list>${renderedAreas}</ha-md-list>`;
    }

    return renderedAreas;
  }

  private _renderDevices(devices: Record<string, Level3Entries>) {
    const renderedDevices = Object.keys(devices)
      .filter((deviceId) => this.devices[deviceId])
      .map((deviceId) => {
        const device = this.devices[deviceId];
        const configEntry = device.primary_config_entry
          ? this._configEntryLookup?.[device.primary_config_entry]
          : undefined;
        const domain = configEntry?.domain;

        const deviceName = computeDeviceName(device) || deviceId;

        return [deviceId, deviceName, domain] as [
          string,
          string | undefined,
          string | undefined,
        ];
      })
      .sort(([, deviceNameA = "zzz"], [, deviceNameB = "zzz"]) =>
        deviceNameA.localeCompare(deviceNameB)
      )
      .map(([deviceId, deviceName, domain]) => {
        if (this.narrow) {
          return html`<ha-md-list-item
            interactive
            type="button"
            .target=${`device${TARGET_SEPARATOR}${deviceId}`}
            @click=${this._selectItem}
          >
            ${domain
              ? html`
                  <img
                    slot="start"
                    alt=""
                    crossorigin="anonymous"
                    referrerpolicy="no-referrer"
                    src=${brandsUrl({
                      domain,
                      type: "icon",
                      darkOptimized: this.hass.themes?.darkMode,
                    })}
                  />
                `
              : nothing}
            <div slot="headline">${deviceName}</div>
            <ha-icon-next slot="end"></ha-icon-next>
          </ha-md-list-item>`;
        }

        const { open, entities } = devices[deviceId];

        return html`<wa-tree-item
          .target=${`device${TARGET_SEPARATOR}${deviceId}`}
          .selected=${this._getSelectedTargetId(this.value) ===
          `device${TARGET_SEPARATOR}${deviceId}`}
          .lazy=${!open && !!entities.length}
          .expanded=${open}
          @wa-lazy-load=${this._expandItem}
          @wa-collapse=${this._collapseItem}
          .title=${deviceName}
        >
          ${domain
            ? html`
                <img
                  alt=""
                  crossorigin="anonymous"
                  referrerpolicy="no-referrer"
                  src=${brandsUrl({
                    domain,
                    type: "icon",
                    darkOptimized: this.hass.themes?.darkMode,
                  })}
                />
              `
            : nothing}
          <span class="item-label">${deviceName}</span>
          ${open ? this._renderEntities(entities) : nothing}
        </wa-tree-item>`;
      });

    if (this.narrow) {
      return html`<ha-section-title
          >${this.localize(
            "ui.components.target-picker.type.devices"
          )}</ha-section-title
        >
        <ha-md-list> ${renderedDevices} </ha-md-list>`;
    }

    return renderedDevices;
  }

  private _renderDomains(
    domains: Record<string, Level3Entries>,
    prefix: "helper_" | "entity_"
  ) {
    const renderedDomains = Object.keys(domains)
      .map((domainTargetId) => {
        const domain = domainTargetId.substring(
          prefix.length,
          domainTargetId.length - TARGET_SEPARATOR.length
        );
        const label = domainToName(
          this.localize,
          domain,
          this.manifests![domain]
        );

        return [domainTargetId, label, domain] as [string, string, string];
      })
      .sort(([, labelA = "zzz"], [, labelB = "zzz"]) =>
        labelA.localeCompare(labelB)
      )
      .map(([domainTargetId, label, domain]) => {
        if (this.narrow) {
          return html`<ha-md-list-item
            interactive
            type="button"
            .target=${domainTargetId}
            @click=${this._selectItem}
          >
            <img
              slot="start"
              class="domain-icon"
              alt=""
              crossorigin="anonymous"
              referrerpolicy="no-referrer"
              src=${brandsUrl({
                domain,
                type: "icon",
                darkOptimized: this.hass.themes?.darkMode,
              })}
            />
            <div slot="headline">${label}</div>
            <ha-icon-next slot="end"></ha-icon-next>
          </ha-md-list-item>`;
        }

        const { open, entities } = domains[domainTargetId];

        return html`<wa-tree-item
          .target=${domainTargetId}
          .selected=${this._getSelectedTargetId(this.value) === domainTargetId}
          .lazy=${!open && !!entities.length}
          .expanded=${open}
          @wa-lazy-load=${this._expandItem}
          @wa-collapse=${this._collapseItem}
          .title=${label}
        >
          <img
            alt=""
            crossorigin="anonymous"
            referrerpolicy="no-referrer"
            class="domain-icon"
            src=${brandsUrl({
              domain,
              type: "icon",
              darkOptimized: this.hass.themes?.darkMode,
            })}
          />
          <span class="item-label">${label}</span>
          ${open ? this._renderEntities(entities) : nothing}
        </wa-tree-item>`;
      });

    if (this.narrow) {
      return html`<ha-section-title
          >${this.localize(
            "ui.components.target-picker.type.devices"
          )}</ha-section-title
        >
        <ha-md-list> ${renderedDomains} </ha-md-list>`;
    }

    return renderedDomains;
  }

  private _renderEntities(entities: string[] = []) {
    if (!entities.length) {
      return nothing;
    }

    const renderedEntites = entities
      .filter((entityId) => this.states[entityId])
      .map((entityId) => {
        const stateObj = this.states[entityId];

        const [entityName, deviceName] = computeEntityNameList(
          stateObj,
          [{ type: "entity" }, { type: "device" }, { type: "area" }],
          this.entities,
          this.devices,
          this.areas,
          this.floors
        );

        const label = entityName || deviceName || entityId;

        return [entityId, label, stateObj] as [string, string, HassEntity];
      })
      .sort(([, labelA], [, labelB]) => labelA.localeCompare(labelB))
      .map(([entityId, label, stateObj]) => {
        if (this.narrow) {
          return html`<ha-md-list-item
            interactive
            type="button"
            .target=${`entity${TARGET_SEPARATOR}${entityId}`}
            @click=${this._selectItem}
          >
            <state-badge
              slot="start"
              .stateObj=${stateObj}
              .hass=${this.hass}
            ></state-badge>
            <div slot="headline" class="item-label">${label}</div>
            <ha-icon-next slot="end"></ha-icon-next>
          </ha-md-list-item>`;
        }

        return html`<wa-tree-item
          .target=${`entity${TARGET_SEPARATOR}${entityId}`}
          .selected=${this._getSelectedTargetId(this.value) ===
          `entity${TARGET_SEPARATOR}${entityId}`}
          .title=${label}
        >
          <state-badge .stateObj=${stateObj} .hass=${this.hass}></state-badge>
          <span class="item-label">${label}</span>
        </wa-tree-item>`;
      });

    if (this.narrow) {
      return html`<ha-section-title
          >${this.localize(
            "ui.components.target-picker.type.entities"
          )}</ha-section-title
        >
        <ha-md-list>${renderedEntites}</ha-md-list>`;
    }

    return renderedEntites;
  }

  // #endregion render

  private _getAreaDeviceLookupMemoized = memoizeOne(
    (devices: HomeAssistant["devices"]) =>
      getAreaDeviceLookup(Object.values(devices))
  );

  private _getAreaEntityLookupMemoized = memoizeOne(
    (entities: HomeAssistant["entities"]) =>
      getAreaEntityLookup(Object.values(entities), true)
  );

  private _getDeviceEntityLookupMemoized = memoizeOne(
    (entities: HomeAssistant["entities"]) =>
      getDeviceEntityLookup(Object.values(entities), true)
  );

  private _getSelectedTargetId = memoizeOne(
    (value: SingleHassServiceTarget | undefined) =>
      value && Object.keys(value).length
        ? `${Object.keys(value)[0].replace("_id", "")}${TARGET_SEPARATOR}${Object.values(value)[0]}`
        : undefined
  );

  private _getTreeData() {
    this._floorAreas = getAreasNestedInFloors(
      this.states,
      this.floors,
      this.areas,
      this.devices,
      this.entities,
      this._formatId,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      true
    );

    this._floorAreas.forEach((floor) => {
      this._entries[floor.id || `floor${TARGET_SEPARATOR}`] = {
        open: false,
        areas: {},
      };

      floor.areas.forEach((area) => {
        this._entries[floor.id || `floor${TARGET_SEPARATOR}`].areas![area.id] =
          this._loadArea(area);
      });
    });

    this._loadUnassignedDevices();
    this._loadUnassignedEntities();
    this._entries = { ...this._entries };

    if (this.value) {
      this._valueChanged(this._getSelectedTargetId(this.value)!, !this.narrow);
    }
  }

  private _formatId = memoizeOne((value: AreaFloorValue): string =>
    [value.type, value.id].join(TARGET_SEPARATOR)
  );

  private _handleSelectionChange(ev: WaSelectionChangeEvent) {
    const treeItem = ev.detail.selection[0] as unknown as
      | { target?: string }
      | undefined;

    if (treeItem?.target) {
      this._valueChanged(treeItem.target);
    }
  }

  private _selectItem(ev: CustomEvent) {
    const target = (ev.currentTarget as any).target;

    if (target) {
      this._valueChanged(target);
    }
  }

  private async _valueChanged(itemId: string, expand = false) {
    const [type, id] = itemId.split(TARGET_SEPARATOR, 2);

    fireEvent(this, "value-changed", {
      value: { [`${type}_id`]: id || undefined },
    });

    if (expand && id) {
      this._expandTreeToItem(type, id);
      await this.updateComplete;
      if (type === "label") {
        this.shadowRoot!.querySelector(
          "ha-md-list-item.selected"
        )?.scrollIntoView({
          block: "center",
        });
      } else {
        this.shadowRoot!.querySelector(
          "wa-tree-item[selected]"
        )?.scrollIntoView({
          block: "center",
        });
      }
    }
  }

  private _expandTreeToItem(type: string, id: string) {
    if (type === "floor" || type === "label") {
      return;
    }

    if (type === "entity") {
      const deviceId = this.entities[id]?.device_id;
      const device = deviceId ? this.devices[deviceId] : undefined;
      const deviceAreaId = (deviceId && device?.area_id) || undefined;

      if (!deviceAreaId) {
        let floor: string;
        let area: string;
        const entity = this.entities[id];

        if (!deviceId && entity.area_id) {
          floor = `floor${TARGET_SEPARATOR}${this.areas[entity.area_id]?.floor_id || ""}`;
          area = `area${TARGET_SEPARATOR}${entity.area_id}`;
        } else if (!deviceId) {
          const domain = id.split(".", 1)[0];
          const isHelper =
            this.manifests![domain]?.integration_type === "helper";

          floor = isHelper
            ? `helper${TARGET_SEPARATOR}`
            : `device${TARGET_SEPARATOR}`;
          area = `${isHelper ? "helper_" : "entity_"}${domain}${TARGET_SEPARATOR}`;
        } else {
          floor = `${device!.entry_type === "service" ? "service" : "area"}${TARGET_SEPARATOR}`;
          area = deviceId;
        }
        this._entries = {
          ...this._entries,
          [floor]: {
            ...this._entries[floor],
            open: true,
            devices: {
              ...this._entries[floor].devices!,
              [area]: {
                ...this._entries[floor].devices![area],
                open: true,
              },
            },
          },
        };
        return;
      }

      const floor = `floor${TARGET_SEPARATOR}${this.areas[deviceAreaId]?.floor_id || ""}`;
      const area = `area${TARGET_SEPARATOR}${deviceAreaId}`;

      this._entries = {
        ...this._entries,
        [floor]: {
          ...this._entries[floor],
          open: true,
          areas: {
            ...this._entries[floor].areas!,
            [area]: {
              ...this._entries[floor].areas![area],
              open: true,
              devices: {
                ...this._entries[floor].areas![area].devices,
                [deviceId!]: {
                  ...this._entries[floor].areas![area].devices![deviceId!],
                  open: true,
                },
              },
            },
          },
        },
      };
      return;
    }

    if (type === "device") {
      const deviceAreaId = this.devices[id]?.area_id;

      if (!deviceAreaId) {
        const device = this.devices[id];
        const floor = `${device.entry_type === "service" ? "service" : "area"}${TARGET_SEPARATOR}`;
        this._entries = {
          ...this._entries,
          [floor]: {
            ...this._entries[floor],
            open: true,
          },
        };
        return;
      }

      const floor = `floor${TARGET_SEPARATOR}${this.areas[deviceAreaId]?.floor_id || ""}`;
      const area = `area${TARGET_SEPARATOR}${deviceAreaId}`;

      this._entries = {
        ...this._entries,
        [floor]: {
          ...this._entries[floor],
          open: true,
          areas: {
            ...this._entries[floor].areas!,
            [area]: {
              ...this._entries[floor].areas![area],
              open: true,
            },
          },
        },
      };
      return;
    }

    if (type === "area") {
      const floor = `floor${TARGET_SEPARATOR}${this.areas[id]?.floor_id || ""}`;
      this._entries = {
        ...this._entries,
        [floor]: {
          ...this._entries[floor],
          open: true,
        },
      };
    }
  }

  private _loadUnassignedDevices() {
    const unassignedDevices = Object.values(this.devices).filter(
      (device) => !device.area_id
    );

    const devices: Record<string, Level3Entries> = {};

    const services: Record<string, Level3Entries> = {};

    unassignedDevices.forEach(({ id: deviceId, entry_type }) => {
      const deviceEntry = {
        open: false,
        entities:
          this._getDeviceEntityLookupMemoized(this.entities)[deviceId]?.map(
            (entity) => entity.entity_id
          ) || [],
      };
      if (entry_type === "service") {
        services[deviceId] = deviceEntry;
        return;
      }

      devices[deviceId] = deviceEntry;
    });

    if (Object.keys(devices).length) {
      this._entries = {
        ...this._entries,
        [`area${TARGET_SEPARATOR}`]: {
          open: false,
          devices,
        },
      };
    }

    if (Object.keys(services).length) {
      this._entries = {
        ...this._entries,
        [`service${TARGET_SEPARATOR}`]: {
          open: false,
          devices: services,
        },
      };
    }
  }

  private _loadUnassignedEntities() {
    Object.values(this.entities)
      .filter((entity) => !entity.area_id && !entity.device_id)
      .forEach(({ entity_id }) => {
        const domain = entity_id.split(".", 2)[0];
        const manifest = this.manifests ? this.manifests[domain] : undefined;
        if (manifest?.integration_type === "helper") {
          if (!this._entries[`helper${TARGET_SEPARATOR}`]) {
            this._entries[`helper${TARGET_SEPARATOR}`] = {
              open: false,
              devices: {},
            };
          }
          if (
            !this._entries[`helper${TARGET_SEPARATOR}`].devices![
              `helper_${domain}${TARGET_SEPARATOR}`
            ]
          ) {
            this._entries[`helper${TARGET_SEPARATOR}`].devices![
              `helper_${domain}${TARGET_SEPARATOR}`
            ] = {
              open: false,
              entities: [],
            };
          }
          this._entries[`helper${TARGET_SEPARATOR}`].devices![
            `helper_${domain}${TARGET_SEPARATOR}`
          ].entities.push(entity_id);
          return;
        }

        if (!this._entries[`device${TARGET_SEPARATOR}`]) {
          this._entries[`device${TARGET_SEPARATOR}`] = {
            open: false,
            devices: {},
          };
        }
        if (
          !this._entries[`device${TARGET_SEPARATOR}`].devices![
            `entity_${domain}${TARGET_SEPARATOR}`
          ]
        ) {
          this._entries[`device${TARGET_SEPARATOR}`].devices![
            `entity_${domain}${TARGET_SEPARATOR}`
          ] = {
            open: false,
            entities: [],
          };
        }
        this._entries[`device${TARGET_SEPARATOR}`].devices![
          `entity_${domain}${TARGET_SEPARATOR}`
        ].entities.push(entity_id);
      });
  }

  private _loadArea(area: FloorComboBoxItem) {
    const [, id] = area.id.split(TARGET_SEPARATOR, 2);
    const referenced_devices =
      this._getAreaDeviceLookupMemoized(this.devices)[id] || [];
    const referenced_entities =
      this._getAreaEntityLookupMemoized(this.entities)[id] || [];

    const devices: Record<string, Level3Entries> = {};

    referenced_devices.forEach(({ id: deviceId }) => {
      devices[deviceId] = {
        open: false,
        entities:
          this._getDeviceEntityLookupMemoized(this.entities)[deviceId]?.map(
            (entity) => entity.entity_id
          ) || [],
      };
    });

    const entities: string[] = [];

    referenced_entities.forEach((entity) => {
      if (!entity.device_id || !devices[entity.device_id]) {
        entities.push(entity.entity_id);
      }
    });

    return {
      open: false,
      devices,
      entities,
    };
  }

  private _toggleItem(targetId: string, open: boolean) {
    const [type, id] = targetId.split(TARGET_SEPARATOR, 2);

    if (type === "floor") {
      this._entries = {
        ...this._entries,
        [targetId]: {
          ...this._entries[targetId],
          open,
        },
      };
      return;
    }

    if (type === "area" && id) {
      const floorId = `floor${TARGET_SEPARATOR}${this.areas[id]?.floor_id || ""}`;

      this._entries = {
        ...this._entries,
        [floorId]: {
          ...this._entries[floorId],
          areas: {
            ...this._entries[floorId].areas,
            [targetId]: {
              ...this._entries[floorId].areas![targetId],
              open,
            },
          },
        },
      };
      return;
    }

    if (type === "area") {
      this._entries = {
        ...this._entries,
        [targetId]: {
          ...this._entries[targetId],
          open,
        },
      };
      return;
    }

    if (type === "service") {
      this._entries = {
        ...this._entries,
        [targetId]: {
          ...this._entries[targetId],
          open,
        },
      };
      return;
    }

    if (type === "device" && id) {
      const areaId = this.devices[id]?.area_id;
      if (areaId) {
        const areaTargetId = `area${TARGET_SEPARATOR}${this.devices[id]?.area_id ?? ""}`;
        const floorId = `floor${TARGET_SEPARATOR}${(areaId && this.areas[areaId]?.floor_id) || ""}`;

        this._entries = {
          ...this._entries,
          [floorId]: {
            ...this._entries[floorId],
            areas: {
              ...this._entries[floorId].areas,
              [areaTargetId]: {
                ...this._entries[floorId].areas![areaTargetId],
                devices: {
                  ...this._entries[floorId].areas![areaTargetId].devices,
                  [id]: {
                    ...this._entries[floorId].areas![areaTargetId].devices[id],
                    open,
                  },
                },
              },
            },
          },
        };
        return;
      }

      const deviceType =
        this.devices[id]?.entry_type === "service" ? "service" : "area";
      const floorId = `${deviceType}${TARGET_SEPARATOR}`;
      this._entries = {
        ...this._entries,
        [floorId]: {
          ...this._entries[floorId],
          devices: {
            ...this._entries[floorId].devices,
            [id]: {
              ...this._entries[floorId].devices![id],
              open,
            },
          },
        },
      };
      return;
    }

    // unassigned entities
    if (type === "device") {
      this._entries = {
        ...this._entries,
        [targetId]: {
          ...this._entries[targetId],
          open,
        },
      };
      return;
    }

    if (type === "helper") {
      this._entries = {
        ...this._entries,
        [targetId]: {
          ...this._entries[targetId],
          open,
        },
      };
      return;
    }

    if (type.startsWith("entity_")) {
      this._entries = {
        ...this._entries,
        [`device${TARGET_SEPARATOR}`]: {
          ...this._entries[`device${TARGET_SEPARATOR}`],
          devices: {
            ...this._entries[`device${TARGET_SEPARATOR}`].devices,
            [targetId]: {
              ...this._entries[`device${TARGET_SEPARATOR}`].devices![targetId],
              open,
            },
          },
        },
      };
      return;
    }

    if (type.startsWith("helper_")) {
      this._entries = {
        ...this._entries,
        [`helper${TARGET_SEPARATOR}`]: {
          ...this._entries[`helper${TARGET_SEPARATOR}`],
          devices: {
            ...this._entries[`helper${TARGET_SEPARATOR}`].devices,
            [targetId]: {
              ...this._entries[`helper${TARGET_SEPARATOR}`].devices![targetId],
              open,
            },
          },
        },
      };
    }
  }

  private _expandItem(ev) {
    const targetId = ev.target.target;
    this._toggleItem(targetId, true);
  }

  private _collapseItem(ev) {
    const targetId = ev.target.target;
    this._toggleItem(targetId, false);
  }

  private async _loadConfigEntries() {
    const configEntries = await getConfigEntries(this.hass);
    this._configEntryLookup = Object.fromEntries(
      configEntries.map((entry) => [entry.entry_id, entry])
    );
  }

  public navigateBack() {
    if (!this.value) {
      return;
    }

    const valueType = Object.keys(this.value)[0].replace("_id", "");
    const valueId = this.value[`${valueType}_id`];

    if (
      valueType === "floor" ||
      valueType === "label" ||
      (!valueId &&
        (valueType === "device" ||
          valueType === "helper" ||
          valueType === "service" ||
          valueType === "area"))
    ) {
      fireEvent(this, "value-changed", { value: undefined });
      return;
    }

    if (valueType === "area") {
      fireEvent(this, "value-changed", {
        value: { floor_id: this.areas[valueId].floor_id || undefined },
      });
      return;
    }

    if (valueType === "device") {
      if (
        !this.devices[valueId].area_id &&
        this.devices[valueId].entry_type === "service"
      ) {
        fireEvent(this, "value-changed", {
          value: { service_id: undefined },
        });
        return;
      }

      fireEvent(this, "value-changed", {
        value: { area_id: this.devices[valueId].area_id || undefined },
      });
      return;
    }

    if (valueType === "entity" && valueId) {
      const deviceId = this.entities[valueId].device_id;
      if (deviceId) {
        fireEvent(this, "value-changed", {
          value: { device_id: deviceId },
        });
        return;
      }

      const areaId = this.entities[valueId].area_id;
      if (areaId) {
        fireEvent(this, "value-changed", {
          value: { area_id: areaId },
        });
        return;
      }

      const domain = valueId.split(".", 2)[0];
      const manifest = this.manifests ? this.manifests[domain] : undefined;
      if (manifest?.integration_type === "helper") {
        fireEvent(this, "value-changed", {
          value: { [`helper_${domain}_id`]: undefined },
        });
        return;
      }

      fireEvent(this, "value-changed", {
        value: { [`entity_${domain}_id`]: undefined },
      });
    }

    if (valueType.startsWith("helper_") || valueType.startsWith("entity_")) {
      fireEvent(this, "value-changed", {
        value: {
          [`${valueType.startsWith("helper_") ? "helper" : "device"}_id`]:
            undefined,
        },
      });
    }
  }

  private _expandHeight() {
    this._fullHeight = true;
    this.style.setProperty("--max-height", "none");
  }

  private async _setShowTargetShowMoreButton() {
    await this.updateComplete;
    this._showShowMoreButton =
      this.narrow &&
      this.value &&
      !!Object.values(this.value)[0] &&
      this.scrollHeight > this.clientHeight;
  }

  static styles = css`
    :host {
      --wa-color-neutral-fill-quiet: var(--ha-color-fill-primary-normal-active);
      position: relative;
    }

    ha-section-title {
      top: 0;
      position: sticky;
      z-index: 1;
    }

    wa-tree-item::part(item) {
      height: var(--ha-space-10);
      padding: var(--ha-space-1) var(--ha-space-3);
      cursor: pointer;
      border-inline-start: 0;
    }
    wa-tree-item::part(label) {
      gap: var(--ha-space-3);
      font-family: var(--ha-font-family-heading);
      font-weight: var(--ha-font-weight-medium);
      overflow: hidden;
    }
    ha-md-list-item {
      --md-list-item-label-text-weight: var(--ha-font-weight-medium);
      --md-list-item-label-text-font: var(--ha-font-family-heading);
    }

    .item-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    ha-svg-icon,
    ha-icon,
    ha-floor-icon {
      padding: var(--ha-space-1);
      color: var(--ha-color-on-neutral-quiet);
    }

    wa-tree-item::part(item):hover {
      background-color: var(--ha-color-fill-neutral-quiet-hover);
    }

    img {
      width: 24px;
      height: 24px;
      padding: var(--ha-space-1);
    }

    img.domain-icon {
      filter: grayscale(100%);
    }

    state-badge {
      width: 24px;
      height: 24px;
    }

    wa-tree-item[selected],
    wa-tree-item[selected] > ha-svg-icon,
    wa-tree-item[selected] > ha-icon,
    wa-tree-item[selected] > ha-floor-icon {
      color: var(--ha-color-on-primary-normal);
    }

    wa-tree-item[selected]::part(item):hover {
      background-color: var(--ha-color-fill-primary-normal-hover);
    }

    wa-tree-item::part(base).tree-item-selected .item {
      background-color: yellow;
    }

    ha-md-list {
      padding: 0;
      --md-list-item-leading-space: var(--ha-space-3);
      --md-list-item-trailing-space: var(--md-list-item-leading-space);
      --md-list-item-bottom-space: var(--ha-space-1);
      --md-list-item-top-space: var(--md-list-item-bottom-space);
      --md-list-item-supporting-text-font: var(--ha-font-size-s);
      --md-list-item-one-line-container-height: var(--ha-space-10);
    }

    ha-md-list-item.selected {
      background-color: var(--ha-color-fill-primary-normal-active);
      --md-list-item-label-text-color: var(--ha-color-on-primary-normal);
      --icon-primary-color: var(--ha-color-on-primary-normal);
    }

    ha-md-list-item.selected ha-icon,
    ha-md-list-item.selected ha-svg-icon {
      color: var(--ha-color-on-primary-normal);
    }

    .targets-show-more {
      display: flex;
      justify-content: center;
      position: absolute;
      bottom: 0;
      width: 100%;
      padding-bottom: var(--ha-space-2);
      box-shadow: inset var(--ha-shadow-offset-x-lg)
        calc(var(--ha-shadow-offset-y-lg) * -1) var(--ha-shadow-blur-lg)
        var(--ha-shadow-spread-lg) var(--ha-color-shadow-light);
    }

    @media all and (max-width: 870px), all and (max-height: 500px) {
      :host {
        max-height: var(--max-height, 50%);
        overflow: hidden;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-automation-add-from-target": HaAutomationAddFromTarget;
  }
}
