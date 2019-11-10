import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-item/paper-item-body";
import "@vaadin/vaadin-combo-box/vaadin-combo-box-light";
import "@polymer/paper-listbox/paper-listbox";
import memoizeOne from "memoize-one";
import {
  LitElement,
  TemplateResult,
  html,
  css,
  CSSResult,
  customElement,
  property,
} from "lit-element";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";

import { HomeAssistant } from "../../types";
import { fireEvent } from "../../common/dom/fire_event";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
  computeDeviceName,
} from "../../data/device_registry";
import { compare } from "../../common/string/compare";
import { PolymerChangedEvent } from "../../polymer-types";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../../data/area_registry";
import { DeviceEntityLookup } from "../../panels/config/devices/ha-devices-data-table";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../data/entity_registry";

interface Device {
  name: string;
  area: string;
  id: string;
}

const rowRenderer = (root: HTMLElement, _owner, model: { item: Device }) => {
  if (!root.firstElementChild) {
    root.innerHTML = `
    <style>
      paper-item {
        margin: -10px 0;
        padding: 0;
      }
    </style>
    <paper-item>
      <paper-item-body two-line="">    
        <div class='name'>[[item.name]]</div>
        <div secondary>[[item.area]]</div>
      </paper-item-body>
    </paper-item>
    `;
  }

  root.querySelector(".name")!.textContent = model.item.name!;
  root.querySelector("[secondary]")!.textContent = model.item.area!;
};

@customElement("ha-device-picker")
class HaDevicePicker extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;
  @property() public label?: string;
  @property() public value?: string;
  @property() public devices?: DeviceRegistryEntry[];
  @property() public areas?: AreaRegistryEntry[];
  @property() public entities?: EntityRegistryEntry[];
  @property({ type: Boolean }) private _opened?: boolean;

  private _getDevices = memoizeOne(
    (
      devices: DeviceRegistryEntry[],
      areas: AreaRegistryEntry[],
      entities: EntityRegistryEntry[]
    ): Device[] => {
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

      const areaLookup: { [areaId: string]: AreaRegistryEntry } = {};
      for (const area of areas) {
        areaLookup[area.area_id] = area;
      }

      const outputDevices = devices.map((device) => {
        return {
          id: device.id,
          name: computeDeviceName(
            device,
            this.hass,
            deviceEntityLookup[device.id]
          ),
          area: device.area_id ? areaLookup[device.area_id].name : "No area",
        };
      });
      if (outputDevices.length === 1) {
        return outputDevices;
      }
      return outputDevices.sort((a, b) => compare(a.name || "", b.name || ""));
    }
  );

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

  protected render(): TemplateResult | void {
    if (!this.devices || !this.areas || !this.entities) {
      return;
    }
    const devices = this._getDevices(this.devices, this.areas, this.entities);
    return html`
      <vaadin-combo-box-light
        item-value-path="id"
        item-id-path="id"
        item-label-path="name"
        .items=${devices}
        .value=${this._value}
        .renderer=${rowRenderer}
        @opened-changed=${this._openedChanged}
        @value-changed=${this._deviceChanged}
      >
        <paper-input
          .label=${this.label}
          class="input"
          autocapitalize="none"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
        >
          ${this.value
            ? html`
                <paper-icon-button
                  aria-label=${this.hass.localize(
                    "ui.components.device-picker.clear"
                  )}
                  slot="suffix"
                  class="clear-button"
                  icon="hass:close"
                  @click=${this._clearValue}
                  no-ripple
                >
                  Clear
                </paper-icon-button>
              `
            : ""}
          ${devices.length > 0
            ? html`
                <paper-icon-button
                  aria-label=${this.hass.localize(
                    "ui.components.device-picker.show_devices"
                  )}
                  slot="suffix"
                  class="toggle-button"
                  .icon=${this._opened ? "hass:menu-up" : "hass:menu-down"}
                >
                  Toggle
                </paper-icon-button>
              `
            : ""}
        </paper-input>
      </vaadin-combo-box-light>
    `;
  }

  private _clearValue() {
    this.value = "";
  }

  private get _value() {
    return this.value || "";
  }

  private _openedChanged(ev: PolymerChangedEvent<boolean>) {
    this._opened = ev.detail.value;
  }

  private _deviceChanged(ev: PolymerChangedEvent<string>) {
    const newValue = ev.detail.value;

    if (newValue !== this._value) {
      this.value = newValue;
      setTimeout(() => {
        fireEvent(this, "value-changed", { value: newValue });
        fireEvent(this, "change");
      }, 0);
    }
  }

  static get styles(): CSSResult {
    return css`
      paper-input > paper-icon-button {
        width: 24px;
        height: 24px;
        padding: 2px;
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
    "ha-device-picker": HaDevicePicker;
  }
}
