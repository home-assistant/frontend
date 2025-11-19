import "@home-assistant/webawesome/dist/components/tree-item/tree-item";
import "@home-assistant/webawesome/dist/components/tree/tree";
import type { WaSelectionChangeEvent } from "@home-assistant/webawesome/dist/events/selection-change";
import { consume } from "@lit/context";
import {
  mdiCubeOutline,
  mdiDevices,
  mdiSelectionMarker,
  mdiTextureBox,
} from "@mdi/js";
import type {
  HassEntity,
  SingleHassServiceTarget,
} from "home-assistant-js-websocket";
import { css, html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
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
  getLabels,
  type LabelRegistryEntry,
} from "../../../../data/label_registry";
import type { HomeAssistant } from "../../../../types";
import { brandsUrl } from "../../../../util/brands-url";

export const TARGET_SEPARATOR = "________";

interface DeviceEntries {
  open: boolean;
  entities: string[];
}

interface AreaEntries {
  open: boolean;
  devices: Record<string, DeviceEntries>;
  entities: string[];
}

@customElement("ha-automation-add-from-target")
export default class HaAutomationAddFromTarget extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public value?: SingleHassServiceTarget;

  @property({ type: Boolean }) public narrow = false;

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

  @state()
  private _areaEntries: Record<string, AreaEntries> = {};

  @state() private _showShowMoreButton?: boolean;

  @state() private _fullHeight = false;

  private _getLabelsMemoized = memoizeOne(getLabels);

  private _configEntryLookup: Record<string, ConfigEntry> = {};

  public willUpdate(changedProps: PropertyValues) {
    super.willUpdate(changedProps);

    if (!this.hasUpdated) {
      this._loadConfigEntries();
      this._getTreeData();
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

  // #region render

  protected render() {
    return html`
      ${!this.narrow || !this.value ? this._renderFloors() : nothing}
      ${this.narrow && this.value ? this._renderNarrow(this.value) : nothing}
      ${!this.narrow || !this.value ? this._renderLabels() : nothing}
      ${!this.narrow || !this.value ? this._renderUnassigned() : nothing}
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

    if (valueType === "floor") {
      return this._renderAreas(
        this._floorAreas.find(
          (floor) =>
            (valueId &&
              floor.id === `${valueType}${TARGET_SEPARATOR}${valueId}`) ||
            (!valueId && !floor.id)
        )?.areas
      );
    }

    if (valueType === "area") {
      const { devices, entities } =
        this._areaEntries[`area${TARGET_SEPARATOR}${valueId ?? ""}`];
      const numberOfDevices = Object.keys(devices).length;

      return html`
        ${numberOfDevices ? this._renderDevices(devices) : nothing}
        ${entities.length ? this._renderEntities(entities) : nothing}
      `;
    }

    if (valueType === "device" && this.devices[valueId]) {
      const deviceArea = this.devices[valueId].area_id!;
      return this._renderEntities(
        this._areaEntries[`area${TARGET_SEPARATOR}${deviceArea}`]?.devices[
          valueId
        ]?.entities
      );
    }
    if (valueType === "device" && !valueId) {
      return this._renderEntities(this._getUnassignedEntities(this.entities));
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
                  ? this._renderAreas(floor.areas)
                  : !floor.id
                    ? nothing
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
                              .path=${mdiSelectionMarker}
                            ></ha-svg-icon>`}

                        <div slot="headline">
                          ${!floor.id
                            ? this.localize(
                                "ui.components.area-picker.unassigned_areas"
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
                  ? this._renderAreas(floor.areas)
                  : !floor.id
                    ? nothing
                    : html`<wa-tree-item
                        .disabledSelection=${!floor.id}
                        .target=${floor.id}
                        .selected=${!!floor.id &&
                        this._getSelectedTargetId(this.value) === floor.id}
                      >
                        ${floor.id && (floor as FloorNestedComboBoxItem).floor
                          ? html`<ha-floor-icon
                              .floor=${(floor as FloorNestedComboBoxItem).floor}
                            ></ha-floor-icon>`
                          : html`<ha-svg-icon
                              .path=${mdiSelectionMarker}
                            ></ha-svg-icon>`}
                        ${!floor.id
                          ? this.localize(
                              "ui.components.area-picker.unassigned_areas"
                            )
                          : floor.primary}
                        ${this._renderAreas(floor.areas)}
                      </wa-tree-item>`
              )}
            </wa-tree>`} `;
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
    const unassignedAreas =
      this._floorAreas.length > 1
        ? this._floorAreas.find((floor) => !floor.id)
        : undefined;

    const unassignedEntities = this._getUnassignedEntities(this.entities);

    if (
      !unassignedAreas?.areas.length &&
      !this._areaEntries[`area${TARGET_SEPARATOR}`] &&
      !Object.keys(this._areaEntries[`area${TARGET_SEPARATOR}`]?.devices)
        .length &&
      !unassignedEntities.length
    ) {
      return nothing;
    }

    return html`<ha-section-title
        >${this.localize(
          "ui.panel.config.automation.editor.unassigned"
        )}</ha-section-title
      >${this.narrow
        ? html`<ha-md-list>
            ${unassignedAreas?.areas.length
              ? html`<ha-md-list-item
                  interactive
                  type="button"
                  .target=${`floor${TARGET_SEPARATOR}`}
                  @click=${this._selectItem}
                >
                  <ha-svg-icon
                    slot="start"
                    .path=${mdiTextureBox}
                  ></ha-svg-icon>
                  <div slot="headline">
                    ${this.localize("ui.components.target-picker.type.areas")}
                  </div>
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-list-item>`
              : nothing}
            ${this._areaEntries[`area${TARGET_SEPARATOR}`] &&
            Object.keys(this._areaEntries[`area${TARGET_SEPARATOR}`]?.devices)
              .length
              ? html`<ha-md-list-item
                  interactive
                  type="button"
                  .target=${`area${TARGET_SEPARATOR}`}
                  @click=${this._selectItem}
                >
                  <ha-svg-icon slot="start" .path=${mdiDevices}></ha-svg-icon>
                  <div slot="headline">
                    ${this.localize("ui.components.target-picker.type.devices")}
                  </div>
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-list-item>`
              : nothing}
            ${unassignedEntities.length
              ? html`<ha-md-list-item
                  interactive
                  type="button"
                  .target=${`device${TARGET_SEPARATOR}`}
                  @click=${this._selectItem}
                >
                  <ha-svg-icon
                    slot="start"
                    .path=${mdiCubeOutline}
                  ></ha-svg-icon>
                  <div slot="headline">
                    ${this.localize(
                      "ui.components.target-picker.type.entities"
                    )}
                  </div>
                  <ha-icon-next slot="end"></ha-icon-next>
                </ha-md-list-item>`
              : nothing}
          </ha-md-list>`
        : html`<wa-tree @wa-selection-change=${this._handleSelectionChange}>
            ${unassignedAreas?.areas.length
              ? html`<wa-tree-item disabled-selection>
                  <ha-svg-icon .path=${mdiSelectionMarker}></ha-svg-icon>
                  ${this.localize("ui.components.target-picker.type.areas")}
                  ${this._renderAreas(unassignedAreas.areas)}
                </wa-tree-item>`
              : nothing}
            ${this._areaEntries[`area${TARGET_SEPARATOR}`] &&
            Object.keys(this._areaEntries[`area${TARGET_SEPARATOR}`]?.devices)
              .length
              ? html`<wa-tree-item disabled-selection>
                  <ha-svg-icon .path=${mdiDevices}></ha-svg-icon>
                  ${this.localize("ui.components.target-picker.type.devices")}
                  ${this._renderDevices(
                    this._areaEntries[`area${TARGET_SEPARATOR}`]?.devices
                  )}
                </wa-tree-item>`
              : nothing}
            ${unassignedEntities.length
              ? html`<wa-tree-item disabled-selection>
                  <ha-svg-icon .path=${mdiCubeOutline}></ha-svg-icon>
                  ${this.localize("ui.components.target-picker.type.entities")}
                  ${this._renderEntities(unassignedEntities)}
                </wa-tree-item>`
              : nothing}
          </wa-tree>`} `;
  }

  private _renderAreas(areas: FloorComboBoxItem[] = []) {
    if (!areas.length) {
      return nothing;
    }

    areas.sort((a, b) => a.primary.localeCompare(b.primary));

    if (this.narrow) {
      return html`<ha-section-title
          >${this.localize(
            "ui.components.target-picker.type.areas"
          )}</ha-section-title
        >
        <ha-md-list>
          ${areas.map(({ id, primary, icon, icon_path }) => {
            if (!this._areaEntries[id]) {
              return nothing;
            }

            return html`<ha-md-list-item
              interactive
              type="button"
              .target=${id}
              @click=${this._selectItem}
            >
              ${icon
                ? html`<ha-icon slot="start" .icon=${icon}></ha-icon>`
                : html`<ha-svg-icon
                    slot="start"
                    .path=${icon_path || mdiTextureBox}
                  ></ha-svg-icon>`}

              <div slot="headline">${primary}</div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>`;
          })}
        </ha-md-list>`;
    }

    return areas.map(({ id, primary, icon, icon_path }) => {
      if (!this._areaEntries[id]) {
        return nothing;
      }

      const { open, devices, entities } = this._areaEntries[id];
      const numberOfDevices = Object.keys(devices).length;
      const numberOfItems = numberOfDevices + entities.length;

      return html`<wa-tree-item
        .target=${id}
        .selected=${this._getSelectedTargetId(this.value) === id}
        .lazy=${!open && !!numberOfItems}
        @wa-lazy-load=${this._expandItem}
        @wa-collapse=${this._collapseItem}
      >
        ${icon
          ? html`<ha-icon .icon=${icon}></ha-icon>`
          : html`<ha-svg-icon
              .path=${icon_path || mdiTextureBox}
            ></ha-svg-icon>`}
        ${primary}
        ${open
          ? html`
              ${numberOfDevices ? this._renderDevices(devices) : nothing}
              ${entities.length ? this._renderEntities(entities) : nothing}
            `
          : nothing}
      </wa-tree-item>`;
    });
  }

  private _renderDevices(devices: Record<string, DeviceEntries>) {
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

  private _getUnassignedEntities = memoizeOne(
    (entities: HomeAssistant["entities"]): string[] =>
      Object.values(entities)
        .filter((entity) => !entity.area_id && !entity.device_id)
        .map(({ entity_id }) => entity_id)
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
      floor.areas.forEach((area) => {
        this._loadArea(area);
      });
    });

    this._loadUnassignedDevices();
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

  private _valueChanged(itemId: string) {
    const [type, id] = itemId.split(TARGET_SEPARATOR, 2);

    fireEvent(this, "value-changed", {
      value: { [`${type}_id`]: id || undefined },
    });
  }

  private _loadUnassignedDevices() {
    const unassignedDevices = Object.values(this.devices)
      .filter((device) => !device.area_id)
      .map(({ id }) => id);

    const devices: Record<string, DeviceEntries> = {};

    unassignedDevices.forEach((deviceId) => {
      devices[deviceId] = {
        open: false,
        entities:
          this._getDeviceEntityLookupMemoized(this.entities)[deviceId]?.map(
            (entity) => entity.entity_id
          ) || [],
      };
    });

    if (Object.keys(devices).length) {
      this._areaEntries = {
        ...this._areaEntries,
        [`area${TARGET_SEPARATOR}`]: {
          open: false,
          devices,
          entities: [],
        },
      };
    }
  }

  private _loadArea(area: FloorComboBoxItem) {
    const [, id] = area.id.split(TARGET_SEPARATOR, 2);
    const referenced_devices =
      this._getAreaDeviceLookupMemoized(this.devices)[id] || [];
    const referenced_entities =
      this._getAreaEntityLookupMemoized(this.entities)[id] || [];

    const devices: Record<string, DeviceEntries> = {};

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

    this._areaEntries = {
      ...this._areaEntries,
      [area.id]: {
        open: false,
        devices,
        entities,
      },
    };
  }

  private _expandItem(ev) {
    const targetId = ev.target.target;
    const [type, id] = targetId.split(TARGET_SEPARATOR, 2);

    if (type === "area") {
      this._areaEntries = {
        ...this._areaEntries,
        [targetId]: {
          ...this._areaEntries[targetId],
          open: true,
        },
      };
    } else if (type === "device") {
      const areaEntry = Object.values(this._areaEntries).find((area) =>
        Object.keys(area.devices).includes(id)
      );
      if (areaEntry) {
        areaEntry.devices[id].open = true;
        this._areaEntries = {
          ...this._areaEntries,
        };
      }
    }
  }

  private _collapseItem(ev) {
    const targetId = ev.target.target;
    const [type, id] = targetId.split(TARGET_SEPARATOR, 2);

    if (type === "area") {
      this._areaEntries = {
        ...this._areaEntries,
        [targetId]: {
          ...this._areaEntries[targetId],
          open: false,
        },
      };
    } else if (type === "device") {
      const areaEntry = Object.values(this._areaEntries).find((area) =>
        Object.keys(area.devices).includes(id)
      );
      if (areaEntry) {
        areaEntry.devices[id].open = false;
        this._areaEntries = {
          ...this._areaEntries,
        };
      }
    }
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

    if (valueType === "floor" || valueType === "label" || !valueId) {
      fireEvent(this, "value-changed", { value: undefined });
      return;
    }

    if (valueType === "area") {
      fireEvent(this, "value-changed", {
        value: { floor_id: this.areas[valueId].floor_id },
      });
      return;
    }

    if (valueType === "device") {
      fireEvent(this, "value-changed", {
        value: { area_id: this.devices[valueId].area_id },
      });
      return;
    }

    if (valueType === "entity") {
      for (const [areaId, areaEntry] of Object.entries(this._areaEntries)) {
        const entityDeviceId = this.entities[valueId].device_id;
        if (entityDeviceId && areaEntry.devices[entityDeviceId]) {
          // Device is also in area -> go back to device
          break;
        }

        if (areaEntry.entities.includes(valueId)) {
          fireEvent(this, "value-changed", {
            value: { area_id: areaId.split(TARGET_SEPARATOR, 2)[1] },
          });
          return;
        }
      }

      fireEvent(this, "value-changed", {
        value: { device_id: this.entities[valueId].device_id },
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

    state-badge {
      min-width: 32px;
      max-width: 32px;
      min-height: 32px;
      max-height: 32px;
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
