import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { customElement, property, query, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import { fireEvent } from "../common/dom/fire_event";
import { computeDomain } from "../common/entity/compute_domain";
import {
  AreaRegistryEntry,
  createAreaRegistryEntry,
  subscribeAreaRegistry,
} from "../data/area_registry";
import {
  DeviceEntityLookup,
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../data/entity_registry";
import {
  showAlertDialog,
  showPromptDialog,
} from "../dialogs/generic/show-dialog-box";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { PolymerChangedEvent } from "../polymer-types";
import { HomeAssistant } from "../types";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./ha-combo-box";
import type { HaComboBox } from "./ha-combo-box";
import "./ha-icon-button";
import "./ha-svg-icon";

const rowRenderer: ComboBoxLitRenderer<AreaRegistryEntry> = (
  item
) => html`<mwc-list-item
  class=${classMap({ "add-new": item.area_id === "add_new" })}
>
  ${item.name}
</mwc-list-item>`;

@customElement("ha-area-picker")
export class HaAreaPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property() public placeholder?: string;

  @property({ type: Boolean, attribute: "no-add" })
  public noAdd?: boolean;

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

  @property() public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property() public entityFilter?: (entity: EntityRegistryEntry) => boolean;

  @property({ type: Boolean }) public disabled?: boolean;

  @property({ type: Boolean }) public required?: boolean;

  @state() private _areas?: AreaRegistryEntry[];

  @state() private _devices?: DeviceRegistryEntry[];

  @state() private _entities?: EntityRegistryEntry[];

  @state() private _opened?: boolean;

  @query("ha-combo-box", true) public comboBox!: HaComboBox;

  private _filter?: string;

  private _init = false;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeAreaRegistry(this.hass.connection!, (areas) => {
        this._areas = areas;
      }),
      subscribeDeviceRegistry(this.hass.connection!, (devices) => {
        this._devices = devices;
      }),
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entities = entities;
      }),
    ];
  }

  public open() {
    this.updateComplete.then(() => {
      this.comboBox?.open();
    });
  }

  public focus() {
    this.updateComplete.then(() => {
      this.comboBox?.focus();
    });
  }

  private _getAreas = memoizeOne(
    (
      areas: AreaRegistryEntry[],
      devices: DeviceRegistryEntry[],
      entities: EntityRegistryEntry[],
      includeDomains: this["includeDomains"],
      excludeDomains: this["excludeDomains"],
      includeDeviceClasses: this["includeDeviceClasses"],
      deviceFilter: this["deviceFilter"],
      entityFilter: this["entityFilter"],
      noAdd: this["noAdd"]
    ): AreaRegistryEntry[] => {
      if (!areas.length) {
        return [
          {
            area_id: "no_areas",
            name: this.hass.localize("ui.components.area-picker.no_areas"),
            picture: null,
          },
        ];
      }

      const deviceEntityLookup: DeviceEntityLookup = {};
      let inputDevices: DeviceRegistryEntry[] | undefined;
      let inputEntities: EntityRegistryEntry[] | undefined;

      if (includeDomains || excludeDomains || includeDeviceClasses) {
        for (const entity of entities) {
          if (!entity.device_id) {
            continue;
          }
          if (!(entity.device_id in deviceEntityLookup)) {
            deviceEntityLookup[entity.device_id] = [];
          }
          deviceEntityLookup[entity.device_id].push(entity);
        }
        inputDevices = devices;
        inputEntities = entities.filter((entity) => entity.area_id);
      } else {
        if (deviceFilter) {
          inputDevices = devices;
        }
        if (entityFilter) {
          inputEntities = entities.filter((entity) => entity.area_id);
        }
      }

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
          (entity) => !excludeDomains.includes(computeDomain(entity.entity_id))
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
        inputDevices = inputDevices!.filter((device) => deviceFilter!(device));
      }

      if (entityFilter) {
        inputEntities = inputEntities!.filter((entity) =>
          entityFilter!(entity)
        );
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
        outputAreas = areas.filter((area) => areaIds!.includes(area.area_id));
      }

      if (!outputAreas.length) {
        outputAreas = [
          {
            area_id: "no_areas",
            name: this.hass.localize("ui.components.area-picker.no_match"),
            picture: null,
          },
        ];
      }

      return noAdd
        ? outputAreas
        : [
            ...outputAreas,
            {
              area_id: "add_new",
              name: this.hass.localize("ui.components.area-picker.add_new"),
              picture: null,
            },
          ];
    }
  );

  protected updated(changedProps: PropertyValues) {
    if (
      (!this._init && this._devices && this._areas && this._entities) ||
      (changedProps.has("_opened") && this._opened)
    ) {
      this._init = true;
      (this.comboBox as any).items = this._getAreas(
        this._areas!,
        this._devices!,
        this._entities!,
        this.includeDomains,
        this.excludeDomains,
        this.includeDeviceClasses,
        this.deviceFilter,
        this.entityFilter,
        this.noAdd
      );
    }
  }

  protected render(): TemplateResult {
    if (!this._devices || !this._areas || !this._entities) {
      return html``;
    }
    return html`
      <ha-combo-box
        .hass=${this.hass}
        .helper=${this.helper}
        item-value-path="area_id"
        item-id-path="area_id"
        item-label-path="name"
        .value=${this.value}
        .disabled=${this.disabled}
        .required=${this.required}
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.area-picker.area")
          : this.label}
        .placeholder=${this.placeholder
          ? this._area(this.placeholder)?.name
          : undefined}
        .renderer=${rowRenderer}
        @filter-changed=${this._filterChanged}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._areaChanged}
      >
      </ha-combo-box>
    `;
  }

  private _area = memoizeOne((areaId: string): AreaRegistryEntry | undefined =>
    this._areas?.find((area) => area.area_id === areaId)
  );

  private _filterChanged(ev: CustomEvent): void {
    this._filter = ev.detail.value;
    if (!this._filter) {
      this.comboBox.filteredItems = this.comboBox.items;
      return;
    }
    // @ts-ignore
    if (!this.noAdd && this.comboBox._comboBox.filteredItems?.length === 0) {
      this.comboBox.filteredItems = [
        {
          area_id: "add_new_suggestion",
          name: this.hass.localize(
            "ui.components.area-picker.add_new_sugestion",
            { name: this._filter }
          ),
          picture: null,
        },
      ];
    } else {
      this.comboBox.filteredItems = this.comboBox.items?.filter((item) =>
        item.name.toLowerCase().includes(this._filter!.toLowerCase())
      );
    }
  }

  private get _value() {
    return this.value || "";
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private _areaChanged(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
    let newValue = ev.detail.value;

    if (newValue === "no_areas") {
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
      title: this.hass.localize("ui.components.area-picker.add_dialog.title"),
      text: this.hass.localize("ui.components.area-picker.add_dialog.text"),
      confirmText: this.hass.localize(
        "ui.components.area-picker.add_dialog.add"
      ),
      inputLabel: this.hass.localize(
        "ui.components.area-picker.add_dialog.name"
      ),
      defaultValue:
        newValue === "add_new_suggestion" ? this._filter : undefined,
      confirm: async (name) => {
        if (!name) {
          return;
        }
        try {
          const area = await createAreaRegistryEntry(this.hass, {
            name,
          });
          this._areas = [...this._areas!, area];
          (this.comboBox as any).filteredItems = this._getAreas(
            this._areas!,
            this._devices!,
            this._entities!,
            this.includeDomains,
            this.excludeDomains,
            this.includeDeviceClasses,
            this.deviceFilter,
            this.entityFilter,
            this.noAdd
          );
          await this.updateComplete;
          await this.comboBox.updateComplete;
          this._setValue(area.area_id);
        } catch (err: any) {
          showAlertDialog(this, {
            title: this.hass.localize(
              "ui.components.area-picker.add_dialog.failed_create_area"
            ),
            text: err.message,
          });
        }
      },
    });
  }

  private _setValue(value: string) {
    this.value = value;
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
      fireEvent(this, "change");
    }, 0);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-area-picker": HaAreaPicker;
  }
}
