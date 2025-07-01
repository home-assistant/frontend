import { mdiPlus, mdiTextureBox } from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { TemplateResult } from "lit";
import { LitElement, html, nothing } from "lit";
import { customElement, property, query } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeAreaName } from "../common/entity/compute_area_name";
import { computeDomain } from "../common/entity/compute_domain";
import { computeFloorName } from "../common/entity/compute_floor_name";
import { getAreaContext } from "../common/entity/context/get_area_context";
import { createAreaRegistryEntry } from "../data/area_registry";
import type {
  DeviceEntityDisplayLookup,
  DeviceRegistryEntry,
} from "../data/device_registry";
import { getDeviceEntityDisplayLookup } from "../data/device_registry";
import type { EntityRegistryDisplayEntry } from "../data/entity_registry";
import { showAlertDialog } from "../dialogs/generic/show-dialog-box";
import { showAreaRegistryDetailDialog } from "../panels/config/areas/show-dialog-area-registry-detail";
import type { HomeAssistant, ValueChangedEvent } from "../types";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./ha-combo-box-item";
import "./ha-generic-picker";
import type { HaGenericPicker } from "./ha-generic-picker";
import "./ha-icon-button";
import type { PickerComboBoxItem } from "./ha-picker-combo-box";
import type { PickerValueRenderer } from "./ha-picker-field";
import "./ha-svg-icon";

const ADD_NEW_ID = "___ADD_NEW___";

@customElement("ha-area-picker")
export class HaAreaPicker extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean, attribute: "no-add" })
  public noAdd = false;

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
    (_haAreas: HomeAssistant["areas"]): PickerValueRenderer =>
      (value) => {
        const area = this.hass.areas[value];

        if (!area) {
          return html`
            <ha-svg-icon slot="start" .path=${mdiTextureBox}></ha-svg-icon>
            <span slot="headline">${area}</span>
          `;
        }

        const { floor } = getAreaContext(area, this.hass);

        const areaName = area ? computeAreaName(area) : undefined;
        const floorName = floor ? computeFloorName(floor) : undefined;

        const icon = area.icon;

        return html`
          ${icon
            ? html`<ha-icon slot="start" .icon=${icon}></ha-icon>`
            : html`<ha-svg-icon
                slot="start"
                .path=${mdiTextureBox}
              ></ha-svg-icon>`}
          <span slot="headline">${areaName}</span>
          ${floorName
            ? html`<span slot="supporting-text">${floorName}</span>`
            : nothing}
        `;
      }
  );

  private _getAreas = memoizeOne(
    (
      haAreas: HomeAssistant["areas"],
      haDevices: HomeAssistant["devices"],
      haEntities: HomeAssistant["entities"],
      includeDomains: this["includeDomains"],
      excludeDomains: this["excludeDomains"],
      includeDeviceClasses: this["includeDeviceClasses"],
      deviceFilter: this["deviceFilter"],
      entityFilter: this["entityFilter"],
      excludeAreas: this["excludeAreas"]
    ): PickerComboBoxItem[] => {
      let deviceEntityLookup: DeviceEntityDisplayLookup = {};
      let inputDevices: DeviceRegistryEntry[] | undefined;
      let inputEntities: EntityRegistryDisplayEntry[] | undefined;

      const areas = Object.values(haAreas);
      const devices = Object.values(haDevices);
      const entities = Object.values(haEntities);

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

      const items = outputAreas.map<PickerComboBoxItem>((area) => {
        const { floor } = getAreaContext(area, this.hass);
        const floorName = floor ? computeFloorName(floor) : undefined;
        const areaName = computeAreaName(area);
        return {
          id: area.area_id,
          primary: areaName || area.area_id,
          secondary: floorName,
          icon: area.icon || undefined,
          icon_path: area.icon ? undefined : mdiTextureBox,
          sorting_label: areaName,
          search_labels: [
            areaName,
            floorName,
            area.area_id,
            ...area.aliases,
          ].filter((v): v is string => Boolean(v)),
        };
      });

      return items;
    }
  );

  private _getItems = () =>
    this._getAreas(
      this.hass.areas,
      this.hass.devices,
      this.hass.entities,
      this.includeDomains,
      this.excludeDomains,
      this.includeDeviceClasses,
      this.deviceFilter,
      this.entityFilter,
      this.excludeAreas
    );

  private _allAreaNames = memoizeOne(
    (areas: HomeAssistant["areas"]) =>
      Object.values(areas)
        .map((area) => computeAreaName(area)?.toLowerCase())
        .filter(Boolean) as string[]
  );

  private _getAdditionalItems = (
    searchString?: string
  ): PickerComboBoxItem[] => {
    if (this.noAdd) {
      return [];
    }

    const allAreas = this._allAreaNames(this.hass.areas);

    if (searchString && !allAreas.includes(searchString.toLowerCase())) {
      return [
        {
          id: ADD_NEW_ID + searchString,
          primary: this.hass.localize(
            "ui.components.area-picker.add_new_sugestion",
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
        primary: this.hass.localize("ui.components.area-picker.add_new"),
        icon_path: mdiPlus,
      },
    ];
  };

  protected render(): TemplateResult {
    const placeholder =
      this.placeholder ?? this.hass.localize("ui.components.area-picker.area");

    const valueRenderer = this._computeValueRenderer(this.hass.areas);

    return html`
      <ha-generic-picker
        .hass=${this.hass}
        .autofocus=${this.autofocus}
        .label=${this.label}
        .helper=${this.helper}
        .notFoundLabel=${this.hass.localize(
          "ui.components.area-picker.no_match"
        )}
        .placeholder=${placeholder}
        .value=${this.value}
        .getItems=${this._getItems}
        .getAdditionalItems=${this._getAdditionalItems}
        .valueRenderer=${valueRenderer}
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

      showAreaRegistryDetailDialog(this, {
        suggestedName: suggestedName,
        createEntry: async (values) => {
          try {
            const area = await createAreaRegistryEntry(this.hass, values);
            this._setValue(area.area_id);
          } catch (err: any) {
            showAlertDialog(this, {
              title: this.hass.localize(
                "ui.components.area-picker.failed_create_area"
              ),
              text: err.message,
            });
          }
        },
      });
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
    "ha-area-picker": HaAreaPicker;
  }
}
