import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ConfigEntry, getConfigEntries } from "../../data/config_entries";
import { DeviceRegistryEntry } from "../../data/device_registry";
import { EntityRegistryEntry } from "../../data/entity_registry";
import { AreaSelector } from "../../data/selector";
import { HomeAssistant } from "../../types";
import "../ha-area-picker";

@customElement("ha-selector-area")
export class HaAreaSelector extends LitElement {
  @property() public hass!: HomeAssistant;

  @property() public selector!: AreaSelector;

  @property() public value?: any;

  @property() public label?: string;

  @state() public _configEntries?: ConfigEntry[];

  @property({ type: Boolean }) public disabled = false;

  protected updated(changedProperties) {
    if (changedProperties.has("selector")) {
      const oldSelector = changedProperties.get("selector");
      if (
        oldSelector !== this.selector &&
        this.selector.area.device?.integration
      ) {
        this._loadConfigEntries();
      }
    }
  }

  protected render() {
    return html`<ha-area-picker
      .hass=${this.hass}
      .value=${this.value}
      .label=${this.label}
      no-add
      .deviceFilter=${(device) => this._filterDevices(device)}
      .entityFilter=${(entity) => this._filterEntities(entity)}
      .includeDeviceClasses=${this.selector.area.entity?.device_class
        ? [this.selector.area.entity.device_class]
        : undefined}
      .includeDomains=${this.selector.area.entity?.domain
        ? [this.selector.area.entity.domain]
        : undefined}
      .disabled=${this.disabled}
    ></ha-area-picker>`;
  }

  private _filterEntities(entity: EntityRegistryEntry): boolean {
    if (this.selector.area.entity?.integration) {
      if (entity.platform !== this.selector.area.entity.integration) {
        return false;
      }
    }
    return true;
  }

  private _filterDevices(device: DeviceRegistryEntry): boolean {
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
  }

  private async _loadConfigEntries() {
    this._configEntries = (await getConfigEntries(this.hass)).filter(
      (entry) => entry.domain === this.selector.area.device?.integration
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-area": HaAreaSelector;
  }
}
