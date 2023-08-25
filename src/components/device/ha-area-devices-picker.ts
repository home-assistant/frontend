import "@material/mwc-button/mwc-button";
import { ComboBoxLitRenderer } from "@vaadin/combo-box/lit";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement, PropertyValues, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { stringCompare } from "../../common/string/compare";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../../data/area_registry";
import {
  DeviceEntityLookup,
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../data/entity_registry";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import { ValueChangedEvent, HomeAssistant } from "../../types";
import "../ha-icon-button";
import "../ha-svg-icon";
import "./ha-devices-picker";

interface DevicesByArea {
  [areaId: string]: AreaDevices;
}

interface AreaDevices {
  id?: string;
  name: string;
  devices: string[];
}

const rowRenderer: ComboBoxLitRenderer<AreaDevices> = (item) =>
  html`<mwc-list-item twoline>
    <span>${item.name}</span>
    <span slot="secondary">${item.devices.length} devices</span>
  </mwc-list-item>`;

@customElement("ha-area-devices-picker")
export class HaAreaDevicesPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public area?: string;

  @property() public devices?: string[];

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
   * Show only deviced with entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  @state() private _areaPicker = true;

  @state() private _devices?: DeviceRegistryEntry[];

  @state() private _areas?: AreaRegistryEntry[];

  @state() private _entities?: EntityRegistryEntry[];

  private _selectedDevices: string[] = [];

  private _filteredDevices: DeviceRegistryEntry[] = [];

  private _getAreasWithDevices = memoizeOne(
    (
      devices: DeviceRegistryEntry[],
      areas: AreaRegistryEntry[],
      entities: EntityRegistryEntry[],
      includeDomains: this["includeDomains"],
      excludeDomains: this["excludeDomains"],
      includeDeviceClasses: this["includeDeviceClasses"]
    ): AreaDevices[] => {
      if (!devices.length) {
        return [];
      }

      const deviceEntityLookup: DeviceEntityLookup = {};
      for (const entity of entities) {
        if (!entity.device_id) {
          continue;
        }
        if (!(entity.device_id in deviceEntityLookup)) {
          deviceEntityLookup[entity.device_id] = [];
        }
        deviceEntityLookup[entity.device_id].push(entity);
      }

      let inputDevices = [...devices];

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

      this._filteredDevices = inputDevices;

      const areaLookup: { [areaId: string]: AreaRegistryEntry } = {};
      for (const area of areas) {
        areaLookup[area.area_id] = area;
      }

      const devicesByArea: DevicesByArea = {};

      for (const device of inputDevices) {
        const areaId = device.area_id;
        if (areaId) {
          if (!(areaId in devicesByArea)) {
            devicesByArea[areaId] = {
              id: areaId,
              name: areaLookup[areaId].name,
              devices: [],
            };
          }
          devicesByArea[areaId].devices.push(device.id);
        }
      }

      const sorted = Object.keys(devicesByArea)
        .sort((a, b) =>
          stringCompare(
            devicesByArea[a].name || "",
            devicesByArea[b].name || "",
            this.hass.locale.language
          )
        )
        .map((key) => devicesByArea[key]);

      return sorted;
    }
  );

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeDeviceRegistry(this.hass.connection!, (devices) => {
        this._devices = devices;
      }),
      subscribeAreaRegistry(this.hass.connection!, (areas) => {
        this._areas = areas;
      }),
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entities = entities;
      }),
    ];
  }

  protected updated(changedProps: PropertyValues) {
    super.updated(changedProps);
    if (changedProps.has("area") && this.area) {
      this._areaPicker = true;
      this.value = this.area;
    } else if (changedProps.has("devices") && this.devices) {
      this._areaPicker = false;
      const filteredDeviceIds = this._filteredDevices.map(
        (device) => device.id
      );
      const selectedDevices = this.devices.filter((device) =>
        filteredDeviceIds.includes(device)
      );
      this._setValue(selectedDevices);
    }
  }

  protected render() {
    if (!this._devices || !this._areas || !this._entities) {
      return nothing;
    }
    const areas = this._getAreasWithDevices(
      this._devices,
      this._areas,
      this._entities,
      this.includeDomains,
      this.excludeDomains,
      this.includeDeviceClasses
    );
    if (!this._areaPicker || areas.length === 0) {
      return html`
        <ha-devices-picker
          @value-changed=${this._devicesPicked}
          .hass=${this.hass}
          .includeDomains=${this.includeDomains}
          .includeDeviceClasses=${this.includeDeviceClasses}
          .value=${this._selectedDevices}
          .pickDeviceLabel=${`Add ${this.label} device`}
          .pickedDeviceLabel=${`${this.label} device`}
        ></ha-devices-picker>
        ${areas.length > 0
          ? html`
              <mwc-button @click=${this._switchPicker}
                >Choose an area</mwc-button
              >
            `
          : ""}
      `;
    }
    return html`
      <ha-combo-box
        .hass=${this.hass}
        item-value-path="id"
        item-id-path="id"
        item-label-path="name"
        .items=${areas}
        .value=${this._value}
        .renderer=${rowRenderer}
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.device-picker.device")
          : `${this.label} in area`}
        @value-changed=${this._areaPicked}
      >
      </ha-combo-box>
      <mwc-button @click=${this._switchPicker}>
        Choose individual devices
      </mwc-button>
    `;
  }

  private get _value() {
    return this.value || [];
  }

  private async _switchPicker() {
    this._areaPicker = !this._areaPicker;
  }

  private async _areaPicked(ev: ValueChangedEvent<string>) {
    const value = ev.detail.value;
    let selectedDevices = [];
    const target = ev.target as any;
    if (target.selectedItem) {
      selectedDevices = target.selectedItem.devices;
    }

    if (value !== this._value || this._selectedDevices !== selectedDevices) {
      this._setValue(selectedDevices, value);
    }
  }

  private _devicesPicked(ev: CustomEvent) {
    ev.stopPropagation();
    const selectedDevices = ev.detail.value;
    this._setValue(selectedDevices);
  }

  private _setValue(selectedDevices: string[], value = "") {
    this.value = value;
    this._selectedDevices = selectedDevices;
    setTimeout(() => {
      fireEvent(this, "value-changed", { value: selectedDevices });
      fireEvent(this, "change");
    }, 0);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-area-devices-picker": HaAreaDevicesPicker;
  }
}
