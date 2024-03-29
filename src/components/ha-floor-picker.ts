import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { HassEntity, UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement, nothing, PropertyValues, TemplateResult } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import {
  fuzzyFilterSort,
  ScorableTextItem,
} from "../common/string/filter/sequence-matching";
import { AreaRegistryEntry } from "../data/area_registry";
import {
  DeviceEntityDisplayLookup,
  DeviceRegistryEntry,
  getDeviceEntityDisplayLookup,
} from "../data/device_registry";
import { EntityRegistryDisplayEntry } from "../data/entity_registry";
import {
  showAlertDialog,
  showPromptDialog,
} from "../dialogs/generic/show-dialog-box";
import { HomeAssistant, ValueChangedEvent } from "../types";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./ha-combo-box";
import type { HaComboBox } from "./ha-combo-box";
import "./ha-icon-button";
import "./ha-list-item";
import "./ha-svg-icon";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import {
  createFloorRegistryEntry,
  FloorRegistryEntry,
  getFloorAreaLookup,
  subscribeFloorRegistry,
} from "../data/floor_registry";

type ScorableFloorRegistryEntry = ScorableTextItem & FloorRegistryEntry;

const rowRenderer: ComboBoxLitRenderer<FloorRegistryEntry> = (item) =>
  html`<ha-list-item
    graphic="icon"
    class=${classMap({ "add-new": item.floor_id === "add_new" })}
  >
    ${item.icon
      ? html`<ha-icon slot="graphic" .icon=${item.icon}></ha-icon>`
      : nothing}
    ${item.name}
  </ha-list-item>`;

@customElement("ha-floor-picker")
export class HaFloorPicker extends SubscribeMixin(LitElement) {
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
  @property({ type: Array, attribute: "exclude-floor" })
  public excludeFloors?: string[];

  @property({ attribute: false })
  public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property({ attribute: false })
  public entityFilter?: (entity: HassEntity) => boolean;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state() private _opened?: boolean;

  @state() private _floors?: FloorRegistryEntry[];

  @query("ha-combo-box", true) public comboBox!: HaComboBox;

  private _suggestion?: string;

  private _init = false;

  public async open() {
    await this.updateComplete;
    await this.comboBox?.open();
  }

  public async focus() {
    await this.updateComplete;
    await this.comboBox?.focus();
  }

  protected hassSubscribe(): (UnsubscribeFunc | Promise<UnsubscribeFunc>)[] {
    return [
      subscribeFloorRegistry(this.hass.connection, (floors) => {
        this._floors = floors;
      }),
    ];
  }

  private _getFloors = memoizeOne(
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
      noAdd: this["noAdd"],
      excludeFloors: this["excludeFloors"]
    ): FloorRegistryEntry[] => {
      if (!floors.length) {
        return [
          {
            floor_id: "no_floors",
            name: this.hass.localize("ui.components.floor-picker.no_floors"),
            icon: null,
            level: 0,
            aliases: [],
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
          floorAreaLookup[floor.floor_id].some((area) =>
            areaIds!.includes(area.area_id)
          )
        );
      }

      if (excludeFloors) {
        outputFloors = outputFloors.filter(
          (floor) => !excludeFloors!.includes(floor.floor_id)
        );
      }

      if (!outputFloors.length) {
        outputFloors = [
          {
            floor_id: "no_floors",
            name: this.hass.localize("ui.components.floor-picker.no_match"),
            icon: null,
            level: 0,
            aliases: [],
          },
        ];
      }

      return noAdd
        ? outputFloors
        : [
            ...outputFloors,
            {
              floor_id: "add_new",
              name: this.hass.localize("ui.components.floor-picker.add_new"),
              icon: "mdi:plus",
              level: 0,
              aliases: [],
            },
          ];
    }
  );

  protected updated(changedProps: PropertyValues) {
    if (
      (!this._init && this.hass && this._floors) ||
      (this._init && changedProps.has("_opened") && this._opened)
    ) {
      this._init = true;
      const floors = this._getFloors(
        this._floors!,
        Object.values(this.hass.areas),
        Object.values(this.hass.devices),
        Object.values(this.hass.entities),
        this.includeDomains,
        this.excludeDomains,
        this.includeDeviceClasses,
        this.deviceFilter,
        this.entityFilter,
        this.noAdd,
        this.excludeFloors
      ).map((floor) => ({
        ...floor,
        strings: [floor.floor_id, floor.name], // ...floor.aliases
      }));
      this.comboBox.items = floors;
      this.comboBox.filteredItems = floors;
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-combo-box
        .hass=${this.hass}
        .helper=${this.helper}
        item-value-path="floor_id"
        item-id-path="floor_id"
        item-label-path="name"
        .value=${this._value}
        .disabled=${this.disabled}
        .required=${this.required}
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.floor-picker.floor")
          : this.label}
        .placeholder=${this.placeholder
          ? this._floors?.find((floor) => floor.floor_id === this.placeholder)
              ?.name
          : undefined}
        .renderer=${rowRenderer}
        @filter-changed=${this._filterChanged}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._floorChanged}
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

    const filteredItems = fuzzyFilterSort<ScorableFloorRegistryEntry>(
      filterString,
      target.items || []
    );
    if (!this.noAdd && filteredItems?.length === 0) {
      this._suggestion = filterString;
      this.comboBox.filteredItems = [
        {
          floor_id: "add_new_suggestion",
          name: this.hass.localize(
            "ui.components.floor-picker.add_new_sugestion",
            { name: this._suggestion }
          ),
          picture: null,
        },
      ];
    } else {
      this.comboBox.filteredItems = filteredItems;
    }
  }

  private get _value() {
    return this.value || "";
  }

  private _openedChanged(ev: ValueChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private _floorChanged(ev: ValueChangedEvent<string>) {
    ev.stopPropagation();
    let newValue = ev.detail.value;

    if (newValue === "no_floors") {
      newValue = "";
    }

    if (!["add_new_suggestion", "add_new"].includes(newValue)) {
      if (newValue !== this._value) {
        this._setValue(newValue);
      }
      return;
    }

    (ev.target as any).value = this._value;
    showPromptDialog(this, {
      title: this.hass.localize("ui.components.floor-picker.add_dialog.title"),
      text: this.hass.localize("ui.components.floor-picker.add_dialog.text"),
      confirmText: this.hass.localize(
        "ui.components.floor-picker.add_dialog.add"
      ),
      inputLabel: this.hass.localize(
        "ui.components.floor-picker.add_dialog.name"
      ),
      defaultValue:
        newValue === "add_new_suggestion" ? this._suggestion : undefined,
      confirm: async (name) => {
        if (!name) {
          return;
        }
        try {
          const floor = await createFloorRegistryEntry(this.hass, {
            name,
          });
          const floors = [...this._floors!, floor];
          this.comboBox.filteredItems = this._getFloors(
            floors,
            Object.values(this.hass.areas)!,
            Object.values(this.hass.devices)!,
            Object.values(this.hass.entities)!,
            this.includeDomains,
            this.excludeDomains,
            this.includeDeviceClasses,
            this.deviceFilter,
            this.entityFilter,
            this.noAdd,
            this.excludeFloors
          );
          await this.updateComplete;
          await this.comboBox.updateComplete;
          this._setValue(floor.floor_id);
        } catch (err: any) {
          showAlertDialog(this, {
            title: this.hass.localize(
              "ui.components.floor-picker.add_dialog.failed_create_floor"
            ),
            text: err.message,
          });
        }
      },
      cancel: () => {
        this._setValue(undefined);
        this._suggestion = undefined;
        this.comboBox.setInputValue("");
      },
    });
  }

  private _setValue(value?: string) {
    this.value = value;
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
      fireEvent(this, "change");
    }, 0);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-floor-picker": HaFloorPicker;
  }
}
