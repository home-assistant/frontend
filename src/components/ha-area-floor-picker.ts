import { mdiTextureBox } from "@mdi/js";
import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { HassEntity } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeAreaName } from "../common/entity/compute_area_name";
import { computeDomain } from "../common/entity/compute_domain";
import { computeFloorName } from "../common/entity/compute_floor_name";
import { stringCompare } from "../common/string/compare";
import { computeRTL } from "../common/util/compute_rtl";
import type { AreaRegistryEntry } from "../data/area_registry";
import type {
  DeviceEntityDisplayLookup,
  DeviceRegistryEntry,
} from "../data/device_registry";
import { getDeviceEntityDisplayLookup } from "../data/device_registry";
import type { EntityRegistryDisplayEntry } from "../data/entity_registry";
import {
  getFloorAreaLookup,
  type FloorRegistryEntry,
} from "../data/floor_registry";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./ha-combo-box-item";
import "./ha-floor-icon";
import "./ha-generic-picker";
import type { HaGenericPicker } from "./ha-generic-picker";
import "./ha-icon-button";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";
import type { PickerValueRenderer } from "./ha-picker-field";
import "./ha-svg-icon";
import "./ha-tree-indicator";

const SEPARATOR = "________";

interface FloorComboBoxItem extends PickerComboBoxItem {
  type: "floor" | "area";
  floor?: FloorRegistryEntry;
  area?: AreaRegistryEntry;
}

interface AreaFloorValue {
  id: string;
  type: "floor" | "area";
}

@customElement("ha-area-floor-picker")
export class HaAreaFloorPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property({ attribute: false }) public value?: AreaFloorValue;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: String, attribute: "search-label" })
  public searchLabel?: string;

  /**
   * Show only areas with entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show no areas with entities of these domains.
   * @type {Array}
   * @attr exclude-domains
   */
  @property({ type: Array, attribute: "exclude-domains" })
  public excludeDomains?: string[];

  /**
   * Show only areas with entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  /**
   * List of areas to be excluded.
   * @type {Array}
   * @attr exclude-areas
   */
  @property({ type: Array, attribute: "exclude-areas" })
  public excludeAreas?: string[];

  /**
   * List of floors to be excluded.
   * @type {Array}
   * @attr exclude-floors
   */
  @property({ type: Array, attribute: "exclude-floors" })
  public excludeFloors?: string[];

  @property({ attribute: false })
  public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property({ attribute: false })
  public entityFilter?: (entity: HassEntity) => boolean;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @query("ha-generic-picker") private _picker?: HaGenericPicker;

  public async open() {
    await this.updateComplete;
    await this._picker?.open();
  }

  private _valueRenderer: PickerValueRenderer = (value: string) => {
    const item = this._parseValue(value);

    const area = item.type === "area" && this.hass.areas[value];

    if (area) {
      const areaName = computeAreaName(area);
      return html`
        ${area.icon
          ? html`<ha-icon slot="start" .icon=${area.icon}></ha-icon>`
          : html`<ha-svg-icon
              slot="start"
              .path=${mdiTextureBox}
            ></ha-svg-icon>`}
        <slot name="headline">${areaName}</slot>
      `;
    }

    const floor = item.type === "floor" && this.hass.floors[value];

    if (floor) {
      const floorName = computeFloorName(floor);
      return html`
        <ha-floor-icon slot="start" .floor=${floor}></ha-floor-icon>
        <span slot="headline">${floorName}</span>
      `;
    }

    return html`
      <ha-svg-icon slot="start" .path=${mdiTextureBox}></ha-svg-icon>
      <span slot="headline">${value}</span>
    `;
  };

  private _getAreasAndFloors = memoizeOne(
    (
      haFloors: HomeAssistant["floors"],
      haAreas: HomeAssistant["areas"],
      haDevices: HomeAssistant["devices"],
      haEntities: HomeAssistant["entities"],
      includeDomains: this["includeDomains"],
      excludeDomains: this["excludeDomains"],
      includeDeviceClasses: this["includeDeviceClasses"],
      deviceFilter: this["deviceFilter"],
      entityFilter: this["entityFilter"],
      excludeAreas: this["excludeAreas"],
      excludeFloors: this["excludeFloors"]
    ): FloorComboBoxItem[] => {
      const floors = Object.values(haFloors);
      const areas = Object.values(haAreas);
      const devices = Object.values(haDevices);
      const entities = Object.values(haEntities);

      let deviceEntityLookup: DeviceEntityDisplayLookup = {};
      let inputDevices: DeviceRegistryEntry[] | undefined;
      let inputEntities: EntityRegistryDisplayEntry[] | undefined;

      if (
        includeDomains ||
        excludeDomains ||
        includeDeviceClasses ||
        deviceFilter ||
        entityFilter
      ) {
        deviceEntityLookup = getDeviceEntityDisplayLookup(entities);
        inputDevices = devices;
        inputEntities = entities.filter((entity) => entity.area_id);

        if (includeDomains) {
          inputDevices = inputDevices!.filter((device) => {
            const devEntities = deviceEntityLookup[device.id];
            if (!devEntities || !devEntities.length) {
              return false;
            }
            return deviceEntityLookup[device.id].some((entity) =>
              includeDomains.includes(computeDomain(entity.entity_id))
            );
          });
          inputEntities = inputEntities!.filter((entity) =>
            includeDomains.includes(computeDomain(entity.entity_id))
          );
        }

        if (excludeDomains) {
          inputDevices = inputDevices!.filter((device) => {
            const devEntities = deviceEntityLookup[device.id];
            if (!devEntities || !devEntities.length) {
              return true;
            }
            return entities.every(
              (entity) =>
                !excludeDomains.includes(computeDomain(entity.entity_id))
            );
          });
          inputEntities = inputEntities!.filter(
            (entity) =>
              !excludeDomains.includes(computeDomain(entity.entity_id))
          );
        }

        if (includeDeviceClasses) {
          inputDevices = inputDevices!.filter((device) => {
            const devEntities = deviceEntityLookup[device.id];
            if (!devEntities || !devEntities.length) {
              return false;
            }
            return deviceEntityLookup[device.id].some((entity) => {
              const stateObj = this.hass.states[entity.entity_id];
              if (!stateObj) {
                return false;
              }
              return (
                stateObj.attributes.device_class &&
                includeDeviceClasses.includes(stateObj.attributes.device_class)
              );
            });
          });
          inputEntities = inputEntities!.filter((entity) => {
            const stateObj = this.hass.states[entity.entity_id];
            return (
              stateObj.attributes.device_class &&
              includeDeviceClasses.includes(stateObj.attributes.device_class)
            );
          });
        }

        if (deviceFilter) {
          inputDevices = inputDevices!.filter((device) =>
            deviceFilter!(device)
          );
        }

        if (entityFilter) {
          inputDevices = inputDevices!.filter((device) => {
            const devEntities = deviceEntityLookup[device.id];
            if (!devEntities || !devEntities.length) {
              return false;
            }
            return deviceEntityLookup[device.id].some((entity) => {
              const stateObj = this.hass.states[entity.entity_id];
              if (!stateObj) {
                return false;
              }
              return entityFilter(stateObj);
            });
          });
          inputEntities = inputEntities!.filter((entity) => {
            const stateObj = this.hass.states[entity.entity_id];
            if (!stateObj) {
              return false;
            }
            return entityFilter!(stateObj);
          });
        }
      }

      let outputAreas = areas;

      let areaIds: string[] | undefined;

      if (inputDevices) {
        areaIds = inputDevices
          .filter((device) => device.area_id)
          .map((device) => device.area_id!);
      }

      if (inputEntities) {
        areaIds = (areaIds ?? []).concat(
          inputEntities
            .filter((entity) => entity.area_id)
            .map((entity) => entity.area_id!)
        );
      }

      if (areaIds) {
        outputAreas = outputAreas.filter((area) =>
          areaIds!.includes(area.area_id)
        );
      }

      if (excludeAreas) {
        outputAreas = outputAreas.filter(
          (area) => !excludeAreas!.includes(area.area_id)
        );
      }

      if (excludeFloors) {
        outputAreas = outputAreas.filter(
          (area) => !area.floor_id || !excludeFloors!.includes(area.floor_id)
        );
      }

      const floorAreaLookup = getFloorAreaLookup(outputAreas);
      const unassisgnedAreas = Object.values(outputAreas).filter(
        (area) => !area.floor_id || !floorAreaLookup[area.floor_id]
      );

      // @ts-ignore
      const floorAreaEntries: [
        FloorRegistryEntry | undefined,
        AreaRegistryEntry[],
      ][] = Object.entries(floorAreaLookup)
        .map(([floorId, floorAreas]) => {
          const floor = floors.find((fl) => fl.floor_id === floorId)!;
          return [floor, floorAreas] as const;
        })
        .sort(([floorA], [floorB]) => {
          if (floorA.level !== floorB.level) {
            return (floorA.level ?? 0) - (floorB.level ?? 0);
          }
          return stringCompare(floorA.name, floorB.name);
        });

      const items: FloorComboBoxItem[] = [];

      floorAreaEntries.forEach(([floor, floorAreas]) => {
        if (floor) {
          const floorName = computeFloorName(floor);

          const areaSearchLabels = floorAreas
            .map((area) => {
              const areaName = computeAreaName(area) || area.area_id;
              return [area.area_id, areaName, ...area.aliases];
            })
            .flat();

          items.push({
            id: this._formatValue({ id: floor.floor_id, type: "floor" }),
            type: "floor",
            primary: floorName,
            floor: floor,
            search_labels: [
              floor.floor_id,
              floorName,
              ...floor.aliases,
              ...areaSearchLabels,
            ],
          });
        }
        items.push(
          ...floorAreas.map((area) => {
            const areaName = computeAreaName(area) || area.area_id;
            return {
              id: this._formatValue({ id: area.area_id, type: "area" }),
              type: "area" as const,
              primary: areaName,
              area: area,
              icon: area.icon || undefined,
              search_labels: [area.area_id, areaName, ...area.aliases],
            };
          })
        );
      });

      items.push(
        ...unassisgnedAreas.map((area) => {
          const areaName = computeAreaName(area) || area.area_id;
          return {
            id: this._formatValue({ id: area.area_id, type: "area" }),
            type: "area" as const,
            primary: areaName,
            icon: area.icon || undefined,
            search_labels: [area.area_id, areaName, ...area.aliases],
          };
        })
      );

      return items;
    }
  );

  private _rowRenderer: ComboBoxLitRenderer<FloorComboBoxItem> = (
    item,
    { index },
    combobox
  ) => {
    const nextItem = combobox.filteredItems?.[index + 1];
    const isLastArea =
      !nextItem ||
      nextItem.type === "floor" ||
      (nextItem.type === "area" && !nextItem.area?.floor_id);

    const rtl = computeRTL(this.hass);

    const hasFloor = item.type === "area" && item.area?.floor_id;

    return html`
      <ha-combo-box-item
        type="button"
        style=${item.type === "area" && hasFloor
          ? "--md-list-item-leading-space: 48px;"
          : ""}
      >
        ${item.type === "area" && hasFloor
          ? html`
              <ha-tree-indicator
                style=${styleMap({
                  width: "48px",
                  position: "absolute",
                  top: "0px",
                  left: rtl ? undefined : "4px",
                  right: rtl ? "4px" : undefined,
                  transform: rtl ? "scaleX(-1)" : "",
                })}
                .end=${isLastArea}
                slot="start"
              ></ha-tree-indicator>
            `
          : nothing}
        ${item.type === "floor" && item.floor
          ? html`<ha-floor-icon
              slot="start"
              .floor=${item.floor}
            ></ha-floor-icon>`
          : item.icon
            ? html`<ha-icon slot="start" .icon=${item.icon}></ha-icon>`
            : html`<ha-svg-icon
                slot="start"
                .path=${item.icon_path || mdiTextureBox}
              ></ha-svg-icon>`}
        ${item.primary}
      </ha-combo-box-item>
    `;
  };

  private _getItems = () =>
    this._getAreasAndFloors(
      this.hass.floors,
      this.hass.areas,
      this.hass.devices,
      this.hass.entities,
      this.includeDomains,
      this.excludeDomains,
      this.includeDeviceClasses,
      this.deviceFilter,
      this.entityFilter,
      this.excludeAreas,
      this.excludeFloors
    );

  private _formatValue = memoizeOne((value: AreaFloorValue): string =>
    [value.type, value.id].join(SEPARATOR)
  );

  private _parseValue = memoizeOne((value: string): AreaFloorValue => {
    const [type, id] = value.split(SEPARATOR);

    return { id, type: type as "floor" | "area" };
  });

  protected render(): TemplateResult {
    const placeholder =
      this.placeholder ?? this.hass.localize("ui.components.area-picker.area");

    const value = this.value ? this._formatValue(this.value) : undefined;

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .autofocus=${this.autofocus}
        .label=${this.label}
        .searchLabel=${this.searchLabel}
        .notFoundLabel=${this.hass.localize(
          "ui.components.area-picker.no_match"
        )}
        .placeholder=${placeholder}
        .value=${value}
        .getItems=${this._getItems}
        .valueRenderer=${this._valueRenderer}
        .rowRenderer=${this._rowRenderer}
        @value-changed=${this._valueChanged}
      >
      </ha-generic-picker>
    `;
  }

  private _valueChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const value = ev.detail.value;

    if (!value) {
      this._setValue(undefined);
      return;
    }

    const selected = this._parseValue(value);
    this._setValue(selected);
  }

  private _setValue(value?: AreaFloorValue) {
    this.value = value;
    fireEvent(this, "value-changed", { value });
    fireEvent(this, "change");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-area-floor-picker": HaAreaFloorPicker;
  }
}
