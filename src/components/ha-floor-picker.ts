import { mdiPlus, mdiTextureBox } from "@mdi/js";
import type { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import type { HassEntity } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { LitElement, html } from "lit";
import { customElement, property, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import { computeFloorName } from "../common/entity/compute_floor_name";
import { updateAreaRegistryEntry } from "../data/area_registry";
import type {
  DeviceEntityDisplayLookup,
  DeviceRegistryEntry,
} from "../data/device_registry";
import { getDeviceEntityDisplayLookup } from "../data/device_registry";
import type { EntityRegistryDisplayEntry } from "../data/entity_registry";
import {
  createFloorRegistryEntry,
  getFloorAreaLookup,
  type FloorRegistryEntry,
} from "../data/floor_registry";
import { showAlertDialog } from "../dialogs/generic/show-dialog-box";
import { showFloorRegistryDetailDialog } from "../panels/config/areas/show-dialog-floor-registry-detail";
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

const ADD_NEW_ID = "___ADD_NEW___";

interface FloorComboBoxItem extends PickerComboBoxItem {
  floor?: FloorRegistryEntry;
}

@customElement("ha-floor-picker")
export class HaFloorPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean, attribute: "no-add" })
  public noAdd = false;

  /**
   * Show only floors with entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show no floors with entities of these domains.
   * @type {Array}
   * @attr exclude-domains
   */
  @property({ type: Array, attribute: "exclude-domains" })
  public excludeDomains?: string[];

  /**
   * Show only floors with entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

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

  // Recompute value renderer when the areas change
  private _computeValueRenderer = memoizeOne(
    (_haAreas: HomeAssistant["floors"]): PickerValueRenderer =>
      (value) => {
        const floor = this.hass.floors[value];

        if (!floor) {
          return html`
            <ha-svg-icon slot="start" .path=${mdiTextureBox}></ha-svg-icon>
            <span slot="headline">${floor}</span>
          `;
        }

        const floorName = floor ? computeFloorName(floor) : undefined;

        return html`
          <ha-floor-icon slot="start" .floor=${floor}></ha-floor-icon>
          <span slot="headline">${floorName}</span>
        `;
      }
  );

  private _getFloors = memoizeOne(
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

      let outputFloors = floors;

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
        const floorAreaLookup = getFloorAreaLookup(areas);
        outputFloors = outputFloors.filter((floor) =>
          floorAreaLookup[floor.floor_id]?.some((area) =>
            areaIds!.includes(area.area_id)
          )
        );
      }

      if (excludeFloors) {
        outputFloors = outputFloors.filter(
          (floor) => !excludeFloors!.includes(floor.floor_id)
        );
      }

      const items = outputFloors.map<FloorComboBoxItem>((floor) => {
        const floorName = computeFloorName(floor);
        return {
          id: floor.floor_id,
          primary: floorName,
          floor: floor,
          sorting_label: floor.level?.toString() || "zzzzz",
          search_labels: [floorName, floor.floor_id, ...floor.aliases].filter(
            (v): v is string => Boolean(v)
          ),
        };
      });

      return items;
    }
  );

  private _rowRenderer: ComboBoxLitRenderer<FloorComboBoxItem> = (item) => html`
    <ha-combo-box-item type="button" compact>
      ${item.icon_path
        ? html`
            <ha-svg-icon
              slot="start"
              style="margin: 0 4px"
              .path=${item.icon_path}
            ></ha-svg-icon>
          `
        : html`
            <ha-floor-icon
              slot="start"
              .floor=${item.floor}
              style="margin: 0 4px"
            ></ha-floor-icon>
          `}
      <span slot="headline">${item.primary}</span>
    </ha-combo-box-item>
  `;

  private _getItems = () =>
    this._getFloors(
      this.hass.floors,
      this.hass.areas,
      this.hass.devices,
      this.hass.entities,
      this.includeDomains,
      this.excludeDomains,
      this.includeDeviceClasses,
      this.deviceFilter,
      this.entityFilter,
      this.excludeFloors
    );

  private _allFloorNames = memoizeOne(
    (floors: HomeAssistant["floors"]) =>
      Object.values(floors)
        .map((floor) => computeFloorName(floor)?.toLowerCase())
        .filter(Boolean) as string[]
  );

  private _getAdditionalItems = (
    searchString?: string
  ): PickerComboBoxItem[] => {
    if (this.noAdd) {
      return [];
    }

    const allFloors = this._allFloorNames(this.hass.floors);

    if (searchString && !allFloors.includes(searchString.toLowerCase())) {
      return [
        {
          id: ADD_NEW_ID + searchString,
          primary: this.hass.localize(
            "ui.components.floor-picker.add_new_sugestion",
            {
              name: searchString,
            }
          ),
          icon_path: mdiPlus,
        },
      ];
    }

    return [
      {
        id: ADD_NEW_ID,
        primary: this.hass.localize("ui.components.floor-picker.add_new"),
        icon_path: mdiPlus,
      },
    ];
  };

  protected render(): TemplateResult {
    const placeholder =
      this.placeholder ??
      this.hass.localize("ui.components.floor-picker.floor");

    const valueRenderer = this._computeValueRenderer(this.hass.floors);

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .autofocus=${this.autofocus}
        .label=${this.label}
        .notFoundLabel=${this.hass.localize(
          "ui.components.floor-picker.no_match"
        )}
        .placeholder=${placeholder}
        .value=${this.value}
        .getItems=${this._getItems}
        .getAdditionalItems=${this._getAdditionalItems}
        .valueRenderer=${valueRenderer}
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

    if (value.startsWith(ADD_NEW_ID)) {
      this.hass.loadFragmentTranslation("config");

      const suggestedName = value.substring(ADD_NEW_ID.length);

      showFloorRegistryDetailDialog(this, {
        suggestedName: suggestedName,
        createEntry: async (values, addedAreas) => {
          try {
            const floor = await createFloorRegistryEntry(this.hass, values);
            addedAreas.forEach((areaId) => {
              updateAreaRegistryEntry(this.hass, areaId, {
                floor_id: floor.floor_id,
              });
            });
            this._setValue(floor.floor_id);
          } catch (err: any) {
            showAlertDialog(this, {
              title: this.hass.localize(
                "ui.components.floor-picker.failed_create_floor"
              ),
              text: err.message,
            });
          }
        },
      });
      return;
    }

    this._setValue(value);
  }

  private _setValue(value?: string) {
    this.value = value;
    fireEvent(this, "value-changed", { value });
    fireEvent(this, "change");
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-floor-picker": HaFloorPicker;
  }
}
