import "@material/mwc-list/mwc-list";
import "@material/mwc-list/mwc-list-item";
import "@material/mwc-tab-bar/mwc-tab-bar";
import "@material/mwc-tab/mwc-tab";
import "@polymer/paper-input/paper-input";
import {
  HassEntity,
  HassServiceTarget,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import { ConfigEntry, getConfigEntries } from "../../data/config_entries";
import { DeviceRegistryEntry } from "../../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../../data/entity_registry";
import { TargetSelector } from "../../data/selector";
import { SubscribeMixin } from "../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../types";
import "../ha-target-picker";

@customElement("ha-selector-target")
export class HaTargetSelector extends SubscribeMixin(LitElement) {
  @property() public hass!: HomeAssistant;

  @property() public selector!: TargetSelector;

  @property() public value?: HassServiceTarget;

  @property() public label?: string;

  @state() private _entityPlaformLookup?: Record<string, string>;

  @state() private _configEntries?: ConfigEntry[];

  @property({ type: Boolean }) public disabled = false;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        const entityLookup = {};
        for (const confEnt of entities) {
          if (!confEnt.platform) {
            continue;
          }
          entityLookup[confEnt.entity_id] = confEnt.platform;
        }
        this._entityPlaformLookup = entityLookup;
      }),
    ];
  }

  protected updated(changedProperties) {
    if (changedProperties.has("selector")) {
      const oldSelector = changedProperties.get("selector");
      if (
        oldSelector !== this.selector &&
        (this.selector.target.device?.integration ||
          this.selector.target.entity?.integration)
      ) {
        this._loadConfigEntries();
      }
    }
  }

  protected render() {
    return html`<ha-target-picker
      .hass=${this.hass}
      .value=${this.value}
      .deviceFilter=${(device) => this._filterDevices(device)}
      .entityRegFilter=${(entity: EntityRegistryEntry) =>
        this._filterRegEntities(entity)}
      .entityFilter=${(entity: HassEntity) => this._filterEntities(entity)}
      .includeDeviceClasses=${this.selector.target.entity?.device_class
        ? [this.selector.target.entity.device_class]
        : undefined}
      .includeDomains=${this.selector.target.entity?.domain
        ? [this.selector.target.entity.domain]
        : undefined}
      .disabled=${this.disabled}
    ></ha-target-picker>`;
  }

  private _filterEntities(entity: HassEntity): boolean {
    if (
      this.selector.target.entity?.integration ||
      this.selector.target.device?.integration
    ) {
      if (
        !this._entityPlaformLookup ||
        this._entityPlaformLookup[entity.entity_id] !==
          (this.selector.target.entity?.integration ||
            this.selector.target.device?.integration)
      ) {
        return false;
      }
    }
    return true;
  }

  private _filterRegEntities(entity: EntityRegistryEntry): boolean {
    if (this.selector.target.entity?.integration) {
      if (entity.platform !== this.selector.target.entity.integration) {
        return false;
      }
    }
    return true;
  }

  private _filterDevices(device: DeviceRegistryEntry): boolean {
    if (
      this.selector.target.device?.manufacturer &&
      device.manufacturer !== this.selector.target.device.manufacturer
    ) {
      return false;
    }
    if (
      this.selector.target.device?.model &&
      device.model !== this.selector.target.device.model
    ) {
      return false;
    }
    if (
      this.selector.target.device?.integration ||
      this.selector.target.entity?.integration
    ) {
      if (
        !this._configEntries?.some((entry) =>
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
      (entry) =>
        entry.domain ===
        (this.selector.target.device?.integration ||
          this.selector.target.entity?.integration)
    );
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-target-picker {
        display: block;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-selector-target": HaTargetSelector;
  }
}
