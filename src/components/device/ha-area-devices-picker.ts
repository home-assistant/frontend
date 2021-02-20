import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button/mwc-icon-button";
import { mdiClose, mdiMenuDown, mdiMenuUp } from "@mdi/js";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "@polymer/paper-listbox/paper-listbox";
import "@vaadin/vaadin-combo-box/theme/material/vaadin-combo-box-light";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import { computeDomain } from "../../common/entity/compute_domain";
import { compare } from "../../common/string/compare";
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
import { PolymerChangedEvent } from "../../polymer-types";
import { HomeAssistant } from "../../types";
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

const rowRenderer = (
  root: HTMLElement,
  _owner,
  model: { item: AreaDevices }
) => {
  if (!root.firstElementChild) {
    root.innerHTML = `
    <style>
      paper-item {
        width: 100%;
        margin: -10px 0;
        padding: 0;
      }
      mwc-icon-button {
        float: right;
      }
      .devices {
        display: none;
      }
      .devices.visible {
        display: block;
      }
    </style>
    <paper-item>
      <paper-item-body two-line="">
        <div class='name'>[[item.name]]</div>
        <div secondary>[[item.devices.length]] devices</div>
      </paper-item-body>
    </paper-item>
    `;
  }
  root.querySelector(".name")!.textContent = model.item.name!;
  root.querySelector(
    "[secondary]"
  )!.textContent = `${model.item.devices.length.toString()} devices`;
};

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

  @property({ type: Boolean })
  private _opened?: boolean;

  @internalProperty() private _areaPicker = true;

  @internalProperty() private _devices?: DeviceRegistryEntry[];

  @internalProperty() private _areas?: AreaRegistryEntry[];

  @internalProperty() private _entities?: EntityRegistryEntry[];

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
          compare(devicesByArea[a].name || "", devicesByArea[b].name || "")
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

  protected render(): TemplateResult {
    if (!this._devices || !this._areas || !this._entities) {
      return html``;
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
      <vaadin-combo-box-light
        item-value-path="id"
        item-id-path="id"
        item-label-path="name"
        .items=${areas}
        .value=${this._value}
        .renderer=${rowRenderer}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._areaPicked}
      >
        <paper-input
          .label=${this.label === undefined && this.hass
            ? this.hass.localize("ui.components.device-picker.device")
            : `${this.label} in area`}
          class="input"
          autocapitalize="none"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
        >
          <div class="suffix" slot="suffix">
            ${this.value
              ? html`<mwc-icon-button
                  class="clear-button"
                  .label=${this.hass.localize(
                    "ui.components.device-picker.clear"
                  )}
                  @click=${this._clearValue}
                  no-ripple
                >
                  <ha-svg-icon .path=${mdiClose}></ha-svg-icon>
                </mwc-icon-button> `
              : ""}
            ${areas.length > 0
              ? html`
                  <mwc-icon-button
                    .label=${this.hass.localize(
                      "ui.components.device-picker.show_devices"
                    )}
                    class="toggle-button"
                  >
                    <ha-svg-icon
                      .path=${this._opened ? mdiMenuUp : mdiMenuDown}
                    ></ha-svg-icon>
                  </mwc-icon-button>
                `
              : ""}
          </div>
        </paper-input>
      </vaadin-combo-box-light>
      <mwc-button @click=${this._switchPicker}
        >Choose individual devices</mwc-button
      >
    `;
  }

  private _clearValue(ev: Event) {
    ev.stopPropagation();
    this._setValue([]);
  }

  private get _value() {
    return this.value || [];
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private async _switchPicker() {
    this._areaPicker = !this._areaPicker;
  }

  private async _areaPicked(ev: PolymerChangedEvent<string>) {
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

  static get styles(): CSSResult {
    return css`
      .suffix {
        display: flex;
      }
      mwc-icon-button {
        --mdc-icon-button-size: 24px;
        padding: 0px 2px;
        color: var(--secondary-text-color);
      }
      [hidden] {
        display: none;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-area-devices-picker": HaAreaDevicesPicker;
  }
}
