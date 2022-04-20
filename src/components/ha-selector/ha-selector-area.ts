import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ConfigEntry, getConfigEntries } from "../../data/config_entries";
import { DeviceRegistryEntry } from "../../data/device_registry";
import { EntityRegistryEntry } from "../../data/entity_registry";
import { AreaSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-area-picker";
import "../ha-areas-picker";

@customElement("ha-selector-area")
export class HaAreaSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: AreaSelector;

  @property() public value?: any;

  @property() public label?: string;

  @property() public helper?: string;

  @state() public _configEntries?: ConfigEntry[];

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = true;

  protected updated(changedProperties) {
    if (changedProperties.has("selector")) {
      const oldSelector = changedProperties.get("selector");
      if (
        oldSelector !== this.selector &&
        this.selector.area.device?.integration
      ) {
        getConfigEntries(this.hass, {
          domain: this.selector.area.device.integration,
        }).then((entries) => {
          this._configEntries = entries;
        });
      }
    }
  }

  protected render() {
    if (!this.selector.area.multiple) {
      return html`
        <ha-area-picker
          .hass=${this.hass}
          .value=${this.value}
          .label=${this.label}
          .helper=${this.helper}
          no-add
          .deviceFilter=${this._filterDevices}
          .entityFilter=${this._filterEntities}
          .includeDeviceClasses=${this.selector.area.entity?.device_class
            ? [this.selector.area.entity.device_class]
            : undefined}
          .includeDomains=${this.selector.area.entity?.domain
            ? [this.selector.area.entity.domain]
            : undefined}
          .disabled=${this.disabled}
          .required=${this.required}
        ></ha-area-picker>
      `;
    }

    return html`
      <ha-areas-picker
        .hass=${this.hass}
        .value=${this.value}
        .helper=${this.helper}
        .pickAreaLabel=${this.label}
        no-add
        .deviceFilter=${this._filterDevices}
        .entityFilter=${this._filterEntities}
        .includeDeviceClasses=${this.selector.area.entity?.device_class
          ? [this.selector.area.entity.device_class]
          : undefined}
        .includeDomains=${this.selector.area.entity?.domain
          ? [this.selector.area.entity.domain]
          : undefined}
        .disabled=${this.disabled}
        .required=${this.required}
      ></ha-areas-picker>
    `;
  }

  private _filterEntities = (entity: EntityRegistryEntry): boolean => {
    if (this.selector.area.entity?.integration) {
      if (entity.platform !== this.selector.area.entity.integration) {
        return false;
      }
    }
    return true;
  };

  private _filterDevices = (device: DeviceRegistryEntry): boolean => {
    if (
      this.selector.area.device?.manufacturer &&
      device.manufacturer !== this.selector.area.device.manufacturer
    ) {
      return false;
    }
    if (
      this.selector.area.device?.model &&
      device.model !== this.selector.area.device.model
    ) {
      return false;
    }
    if (this.selector.area.device?.integration) {
      if (
        this._configEntries &&
        !this._configEntries.some((entry) =>
          device.config_entries.includes(entry.entry_id)
        )
      ) {
        return false;
      }
    }
    return true;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-area": HaAreaSelector;
  }
}
