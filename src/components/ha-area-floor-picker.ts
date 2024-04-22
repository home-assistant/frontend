import { mdiTextureBox } from "@mdi/js";
import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { LitElement, PropertyValues, TemplateResult, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { styleMap } from "lit/directives/style-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import { stringCompare } from "../common/string/compare";
import {
  ScorableTextItem,
  fuzzyFilterSort,
} from "../common/string/filter/sequence-matching";
import { computeRTL } from "../common/util/compute_rtl";
import { AreaRegistryEntry } from "../data/area_registry";
import {
  DeviceEntityDisplayLookup,
  DeviceRegistryEntry,
  getDeviceEntityDisplayLookup,
} from "../data/device_registry";
import { EntityRegistryDisplayEntry } from "../data/entity_registry";
import {
  FloorRegistryEntry,
  getFloorAreaLookup,
  subscribeFloorRegistry,
} from "../data/floor_registry";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { HomeAssistant, ValueChangedEvent } from "../types";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./ha-combo-box";
import type { HaComboBox } from "./ha-combo-box";
import "./ha-floor-icon";
import "./ha-icon-button";
import "./ha-list-item";
import "./ha-svg-icon";
import "./ha-tree-indicator";

type ScorableAreaFloorEntry = ScorableTextItem & FloorAreaEntry;

interface FloorAreaEntry {
  id: string | null;
  name: string;
  icon: string | null;
  strings: string[];
  type: "floor" | "area";
  level: number | null;
  hasFloor?: boolean;
  lastArea?: boolean;
}

@customElement("ha-area-floor-picker")
export class HaAreaFloorPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

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

  @state() private _floors?: FloorRegistryEntry[];

  @state() private _opened?: boolean;

  @query("ha-combo-box", true) public comboBox!: HaComboBox;

  private _init = false;

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeFloorRegistry(this.hass.connection, (floors) => {
        this._floors = floors;
      }),
    ];
  }

  public async open() {
    await this.updateComplete;
    await this.comboBox?.open();
  }

  public async focus() {
    await this.updateComplete;
    await this.comboBox?.focus();
  }

  private _rowRenderer: ComboBoxLitRenderer<FloorAreaEntry> = (item) => {
    const rtl = computeRTL(this.hass);
    return html`
      <ha-list-item
        graphic="icon"
        style=${item.type === "area" && item.hasFloor
          ? rtl
            ? "--mdc-list-side-padding-right: 48px;"
            : "--mdc-list-side-padding-left: 48px;"
          : ""}
      >
        ${item.type === "area" && item.hasFloor
          ? html`<ha-tree-indicator
              style=${styleMap({
                width: "48px",
                position: "absolute",
                top: "0px",
                left: rtl ? undefined : "8px",
                right: rtl ? "8px" : undefined,
                transform: rtl ? "scaleX(-1)" : "",
              })}
              .end=${item.lastArea}
              slot="graphic"
            ></ha-tree-indicator>`
          : nothing}
        ${item.type === "floor"
          ? html`<ha-floor-icon slot="graphic" .floor=${item}></ha-floor-icon>`
          : item.icon
            ? html`<ha-icon slot="graphic" .icon=${item.icon}></ha-icon>`
            : html`<ha-svg-icon
                slot="graphic"
                .path=${mdiTextureBox}
              ></ha-svg-icon>`}
        ${item.name}
      </ha-list-item>
    `;
  };

  private _getAreas = memoizeOne(
    (
      floors: FloorRegistryEntry[],
      areas: AreaRegistryEntry[],
      devices: DeviceRegistryEntry[],
      entities: EntityRegistryDisplayEntry[],
      includeDomains: this["includeDomains"],
      excludeDomains: this["excludeDomains"],
      includeDeviceClasses: this["includeDeviceClasses"],
      deviceFilter: this["deviceFilter"],
      entityFilter: this["entityFilter"],
      excludeAreas: this["excludeAreas"],
      excludeFloors: this["excludeFloors"]
    ): FloorAreaEntry[] => {
      if (!areas.length && !floors.length) {
        return [
          {
            id: "no_areas",
            type: "area",
            name: this.hass.localize("ui.components.area-picker.no_areas"),
            icon: null,
            strings: [],
            level: null,
          },
        ];
      }

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

      if (!outputAreas.length) {
        return [
          {
            id: "no_areas",
            type: "area",
            name: this.hass.localize("ui.components.area-picker.no_match"),
            icon: null,
            strings: [],
            level: null,
          },
        ];
      }

      const floorAreaLookup = getFloorAreaLookup(outputAreas);
      const unassisgnedAreas = Object.values(outputAreas).filter(
        (area) => !area.floor_id || !floorAreaLookup[area.floor_id]
      );

      // @ts-ignore
      const floorAreaEntries: Array<
        [FloorRegistryEntry | undefined, AreaRegistryEntry[]]
      > = Object.entries(floorAreaLookup)
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

      const output: FloorAreaEntry[] = [];

      floorAreaEntries.forEach(([floor, floorAreas]) => {
        if (floor) {
          output.push({
            id: floor.floor_id,
            type: "floor",
            name: floor.name,
            icon: floor.icon,
            strings: [floor.floor_id, ...floor.aliases, floor.name],
            level: floor.level,
          });
        }
        output.push(
          ...floorAreas.map((area, index, array) => ({
            id: area.area_id,
            type: "area" as const,
            name: area.name,
            icon: area.icon,
            strings: [area.area_id, ...area.aliases, area.name],
            hasFloor: true,
            level: null,
            lastArea: index === array.length - 1,
          }))
        );
      });

      if (!output.length && !unassisgnedAreas.length) {
        output.push({
          id: "no_areas",
          type: "area",
          name: this.hass.localize(
            "ui.components.area-picker.unassigned_areas"
          ),
          icon: null,
          strings: [],
          level: null,
        });
      }

      output.push(
        ...unassisgnedAreas.map((area) => ({
          id: area.area_id,
          type: "area" as const,
          name: area.name,
          icon: area.icon,
          strings: [area.area_id, ...area.aliases, area.name],
          level: null,
        }))
      );

      return output;
    }
  );

  protected updated(changedProps: PropertyValues) {
    if (
      (!this._init && this.hass && this._floors) ||
      (this._init && changedProps.has("_opened") && this._opened)
    ) {
      this._init = true;
      const areas = this._getAreas(
        this._floors!,
        Object.values(this.hass.areas),
        Object.values(this.hass.devices),
        Object.values(this.hass.entities),
        this.includeDomains,
        this.excludeDomains,
        this.includeDeviceClasses,
        this.deviceFilter,
        this.entityFilter,
        this.excludeAreas,
        this.excludeFloors
      );
      this.comboBox.items = areas;
      this.comboBox.filteredItems = areas;
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-combo-box
        .hass=${this.hass}
        .helper=${this.helper}
        item-value-path="id"
        item-id-path="id"
        item-label-path="name"
        .value=${this._value}
        .disabled=${this.disabled}
        .required=${this.required}
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.area-picker.area")
          : this.label}
        .placeholder=${this.placeholder
          ? this.hass.areas[this.placeholder]?.name
          : undefined}
        .renderer=${this._rowRenderer}
        @filter-changed=${this._filterChanged}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._areaChanged}
      >
      </ha-combo-box>
    `;
  }

  private _filterChanged(ev: CustomEvent): void {
    const target = ev.target as HaComboBox;
    const filterString = ev.detail.value;
    if (!filterString) {
      this.comboBox.filteredItems = this.comboBox.items;
      return;
    }

    const filteredItems = fuzzyFilterSort<ScorableAreaFloorEntry>(
      filterString,
      target.items || []
    );

    this.comboBox.filteredItems = filteredItems;
  }

  private get _value() {
    return this.value || "";
  }

  private _openedChanged(ev: ValueChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private async _areaChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    const newValue = ev.detail.value;

    if (newValue === "no_areas") {
      return;
    }

    const selected = this.comboBox.selectedItem;

    fireEvent(this, "value-changed", {
      value: {
        id: selected.id,
        type: selected.type,
      },
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-area-floor-picker": HaAreaFloorPicker;
  }
}
