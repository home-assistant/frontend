import "@material/mwc-list/mwc-list-item";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { stringCompare } from "../../common/string/compare";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../../data/area_registry";
import {
  computeDeviceName,
  DeviceEntityLookup,
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../data/entity_registry";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import { PolymerChangedEvent } from "../../polymer-types";
import { HomeAssistant } from "../../types";
import "../ha-combo-box";
import type { HaComboBox } from "../ha-combo-box";

interface Device {
  name: string;
  area: string;
  id: string;
}

export type HaDevicePickerDeviceFilterFunc = (
  device: DeviceRegistryEntry
) => boolean;

const rowRenderer: ComboBoxLitRenderer<Device> = (item) => html`<mwc-list-item
  .twoline=${!!item.area}
>
  <span>${item.name}</span>
  <span slot="secondary">${item.area}</span>
</mwc-list-item>`;

@customElement("ha-device-picker")
export class HaDevicePicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property() public devices?: DeviceRegistryEntry[];

  @property() public areas?: AreaRegistryEntry[];

  @property() public entities?: EntityRegistryEntry[];

  /**
   * Show only devices with entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show no devices with entities of these domains.
   * @type {Array}
   * @attr exclude-domains
   */
  @property({ type: Array, attribute: "exclude-domains" })
  public excludeDomains?: string[];

  /**
   * Show only devices with entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  @property() public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property({ type: Boolean }) public disabled?: boolean;

  @property({ type: Boolean }) public required?: boolean;

  @state() private _opened?: boolean;

  @query("ha-combo-box", true) public comboBox!: HaComboBox;

  private _init = false;

  private _getDevices = memoizeOne(
    (
      devices: DeviceRegistryEntry[],
      areas: AreaRegistryEntry[],
      entities: EntityRegistryEntry[],
      includeDomains: this["includeDomains"],
      excludeDomains: this["excludeDomains"],
      includeDeviceClasses: this["includeDeviceClasses"],
      deviceFilter: this["deviceFilter"]
    ): Device[] => {
      if (!devices.length) {
        return [
          {
            id: "no_devices",
            area: "",
            name: this.hass.localize("ui.components.device-picker.no_devices"),
          },
        ];
      }

      const deviceEntityLookup: DeviceEntityLookup = {};

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
      }

      const areaLookup: { [areaId: string]: AreaRegistryEntry } = {};
      for (const area of areas) {
        areaLookup[area.area_id] = area;
      }

      let inputDevices = devices.filter(
        (device) => device.id === this.value || !device.disabled_by
      );

      if (includeDomains) {
        inputDevices = inputDevices.filter((device) => {
          const devEntities = deviceEntityLookup[device.id];
          if (!devEntities || !devEntities.length) {
            return false;
          }
          return deviceEntityLookup[device.id].some((entity) =>
            includeDomains.includes(computeDomain(entity.entity_id))
          );
        });
      }

      if (excludeDomains) {
        inputDevices = inputDevices.filter((device) => {
          const devEntities = deviceEntityLookup[device.id];
          if (!devEntities || !devEntities.length) {
            return true;
          }
          return entities.every(
            (entity) =>
              !excludeDomains.includes(computeDomain(entity.entity_id))
          );
        });
      }

      if (includeDeviceClasses) {
        inputDevices = inputDevices.filter((device) => {
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
      }

      if (deviceFilter) {
        inputDevices = inputDevices.filter(
          (device) =>
            // We always want to include the device of the current value
            device.id === this.value || deviceFilter!(device)
        );
      }

      const outputDevices = inputDevices.map((device) => ({
        id: device.id,
        name: computeDeviceName(
          device,
          this.hass,
          deviceEntityLookup[device.id]
        ),
        area:
          device.area_id && areaLookup[device.area_id]
            ? areaLookup[device.area_id].name
            : this.hass.localize("ui.components.device-picker.no_area"),
      }));
      if (!outputDevices.length) {
        return [
          {
            id: "no_devices",
            area: "",
            name: this.hass.localize("ui.components.device-picker.no_match"),
          },
        ];
      }
      if (outputDevices.length === 1) {
        return outputDevices;
      }
      return outputDevices.sort((a, b) =>
        stringCompare(a.name || "", b.name || "")
      );
    }
  );

  public open() {
    this.comboBox?.open();
  }

  public focus() {
    this.comboBox?.focus();
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeDeviceRegistry(this.hass.connection!, (devices) => {
        this.devices = devices;
      }),
      subscribeAreaRegistry(this.hass.connection!, (areas) => {
        this.areas = areas;
      }),
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this.entities = entities;
      }),
    ];
  }

  protected updated(changedProps: PropertyValues) {
    if (
      (!this._init && this.devices && this.areas && this.entities) ||
      (changedProps.has("_opened") && this._opened)
    ) {
      this._init = true;
      (this.comboBox as any).items = this._getDevices(
        this.devices!,
        this.areas!,
        this.entities!,
        this.includeDomains,
        this.excludeDomains,
        this.includeDeviceClasses,
        this.deviceFilter
      );
    }
  }

  protected render(): TemplateResult {
    if (!this.devices || !this.areas || !this.entities) {
      return html``;
    }
    return html`
      <ha-combo-box
        .hass=${this.hass}
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.device-picker.device")
          : this.label}
        .value=${this._value}
        .helper=${this.helper}
        .renderer=${rowRenderer}
        .disabled=${this.disabled}
        .required=${this.required}
        item-value-path="id"
        item-label-path="name"
        @opened-changed=${this._openedChanged}
        @value-changed=${this._deviceChanged}
      ></ha-combo-box>
    `;
  }

  private get _value() {
    return this.value || "";
  }

  private _deviceChanged(ev: PolymerChangedEvent<string>) {
    ev.stopPropagation();
    let newValue = ev.detail.value;

    if (newValue === "no_devices") {
      newValue = "";
    }

    if (newValue !== this._value) {
      this._setValue(newValue);
    }
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
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
    "ha-device-picker": HaDevicePicker;
  }
}
