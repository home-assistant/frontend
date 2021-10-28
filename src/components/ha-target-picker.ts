import "@material/mwc-button/mwc-button";
import {
  mdiClose,
  mdiDevices,
  mdiPlus,
  mdiSofa,
  mdiUnfoldMoreVertical,
} from "@mdi/js";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  HassEntity,
  HassServiceTarget,
  UnsubscribeFunc,
} from "home-assistant-js-websocket";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { ensureArray } from "../common/ensure-array";
import { computeDomain } from "../common/entity/compute_domain";
import { computeStateName } from "../common/entity/compute_state_name";
import { stateIconPath } from "../common/entity/state_icon_path";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../data/area_registry";
import {
  computeDeviceName,
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../data/device_registry";
import {
  EntityRegistryEntry,
  subscribeEntityRegistry,
} from "../data/entity_registry";
import { SubscribeMixin } from "../mixins/subscribe-mixin";
import { HomeAssistant } from "../types";
import "./device/ha-device-picker";
import type { HaDevicePickerDeviceFilterFunc } from "./device/ha-device-picker";
import "./entity/ha-entity-picker";
import type { HaEntityPickerEntityFilterFunc } from "./entity/ha-entity-picker";
import "./ha-area-picker";
import "./ha-chip-set";
import "./ha-icon-button";
import "./ha-svg-icon";

@customElement("ha-target-picker")
export class HaTargetPicker extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public value?: HassServiceTarget;

  @property() public label?: string;

  /**
   * Show only targets with entities from specific domains.
   * @type {Array}
   * @attr include-domains
   */
  @property({ type: Array, attribute: "include-domains" })
  public includeDomains?: string[];

  /**
   * Show only targets with entities of these device classes.
   * @type {Array}
   * @attr include-device-classes
   */
  @property({ type: Array, attribute: "include-device-classes" })
  public includeDeviceClasses?: string[];

  @property() public deviceFilter?: HaDevicePickerDeviceFilterFunc;

  @property() public entityRegFilter?: (entity: EntityRegistryEntry) => boolean;

  @property() public entityFilter?: HaEntityPickerEntityFilterFunc;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @state() private _areas?: { [areaId: string]: AreaRegistryEntry };

  @state() private _devices?: {
    [deviceId: string]: DeviceRegistryEntry;
  };

  @state() private _entities?: EntityRegistryEntry[];

  @state() private _addMode?: "area_id" | "entity_id" | "device_id";

  @query("#input") private _inputElement?;

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeAreaRegistry(this.hass.connection!, (areas) => {
        const areaLookup: { [areaId: string]: AreaRegistryEntry } = {};
        for (const area of areas) {
          areaLookup[area.area_id] = area;
        }
        this._areas = areaLookup;
      }),
      subscribeDeviceRegistry(this.hass.connection!, (devices) => {
        const deviceLookup: { [deviceId: string]: DeviceRegistryEntry } = {};
        for (const device of devices) {
          deviceLookup[device.id] = device;
        }
        this._devices = deviceLookup;
      }),
      subscribeEntityRegistry(this.hass.connection!, (entities) => {
        this._entities = entities;
      }),
    ];
  }

  protected render() {
    if (!this._areas || !this._devices || !this._entities) {
      return html``;
    }
    return html`<ha-chip-set>
        ${this.value?.area_id
          ? ensureArray(this.value.area_id).map((area_id) => {
              const area = this._areas![area_id];
              return this._renderChip(
                "area_id",
                area_id,
                area?.name || area_id,
                undefined,
                mdiSofa
              );
            })
          : ""}
        ${this.value?.device_id
          ? ensureArray(this.value.device_id).map((device_id) => {
              const device = this._devices![device_id];
              return this._renderChip(
                "device_id",
                device_id,
                device ? computeDeviceName(device, this.hass) : device_id,
                undefined,
                mdiDevices
              );
            })
          : ""}
        ${this.value?.entity_id
          ? ensureArray(this.value.entity_id).map((entity_id) => {
              const entity = this.hass.states[entity_id];
              return this._renderChip(
                "entity_id",
                entity_id,
                entity ? computeStateName(entity) : entity_id,
                entity
              );
            })
          : ""}
      </ha-chip-set>
      ${this._renderPicker()}
      <ha-chip-set>
        <ha-chip
          class="area_id add"
          .type=${"area_id"}
          @click=${this._showPicker}
          .leadingIcon=${mdiPlus}
          .label=${this.hass.localize(
            "ui.components.target-picker.add_area_id"
          )}
        >
        </ha-chip>
        <ha-chip
          class="device_id add"
          .type=${"device_id"}
          @click=${this._showPicker}
          .leadingIcon=${mdiPlus}
          .label=${this.hass.localize(
            "ui.components.target-picker.add_device_id"
          )}
        >
        </ha-chip>
        <ha-chip
          class="entity_id add"
          .type=${"entity_id"}
          @click=${this._showPicker}
          .leadingIcon=${mdiPlus}
          .label=${this.hass.localize(
            "ui.components.target-picker.add_entity_id"
          )}
        ></ha-chip>
      </ha-chip-set>`;
  }

  private async _showPicker(ev) {
    this._addMode = ev.currentTarget.type;
    await this.updateComplete;
    setTimeout(() => {
      this._inputElement?.open();
      this._inputElement?.focus();
    }, 0);
  }

  private _renderChip(
    type: string,
    id: string,
    name: string,
    entityState?: HassEntity,
    iconPath?: string
  ) {
    return html`
      <ha-chip
        class=${type}
        .id=${id}
        .leadingIcon=${iconPath ||
        entityState?.attributes.icon ||
        stateIconPath(entityState)}
        .label=${name}
        outlined
      >
        <div slot="trailing-icon">
          ${type === "entity_id"
            ? ""
            : html`
                <span>
                  <ha-icon-button
                    class="expand-btn"
                    tabindex="-1"
                    role="button"
                    .label=${this.hass.localize(
                      "ui.components.target-picker.expand"
                    )}
                    .path=${mdiUnfoldMoreVertical}
                    hideTitle
                    .id=${id}
                    .type=${type}
                    @click=${this._handleExpand}
                  ></ha-icon-button>
                  <paper-tooltip class="expand" animation-delay="0"
                    >${this.hass.localize(
                      `ui.components.target-picker.expand_${type}`
                    )}</paper-tooltip
                  >
                </span>
              `}
          <span>
            <ha-icon-button
              tabindex="-1"
              role="button"
              .label=${this.hass.localize("ui.components.target-picker.expand")}
              .path=${mdiClose}
              hideTitle
              .id=${id}
              .type=${type}
              @click=${this._handleRemove}
            ></ha-icon-button>
            <paper-tooltip animation-delay="0"
              >${this.hass.localize(
                `ui.components.target-picker.remove_${type}`
              )}</paper-tooltip
            >
          </span>
        </div>
      </ha-chip>
    `;
  }

  private _renderPicker() {
    switch (this._addMode) {
      case "area_id":
        return html`<ha-area-picker
          .hass=${this.hass}
          id="input"
          .type=${"area_id"}
          .label=${this.hass.localize(
            "ui.components.target-picker.add_area_id"
          )}
          no-add
          .deviceFilter=${this.deviceFilter}
          .entityFilter=${this.entityRegFilter}
          .includeDeviceClasses=${this.includeDeviceClasses}
          .includeDomains=${this.includeDomains}
          @value-changed=${this._targetPicked}
        ></ha-area-picker>`;
      case "device_id":
        return html`<ha-device-picker
          .hass=${this.hass}
          id="input"
          .type=${"device_id"}
          .label=${this.hass.localize(
            "ui.components.target-picker.add_device_id"
          )}
          .deviceFilter=${this.deviceFilter}
          .entityFilter=${this.entityRegFilter}
          .includeDeviceClasses=${this.includeDeviceClasses}
          .includeDomains=${this.includeDomains}
          @value-changed=${this._targetPicked}
        ></ha-device-picker>`;
      case "entity_id":
        return html`<ha-entity-picker
          .hass=${this.hass}
          id="input"
          .type=${"entity_id"}
          .label=${this.hass.localize(
            "ui.components.target-picker.add_entity_id"
          )}
          .entityFilter=${this.entityFilter}
          .includeDeviceClasses=${this.includeDeviceClasses}
          .includeDomains=${this.includeDomains}
          @value-changed=${this._targetPicked}
          allow-custom-entity
        ></ha-entity-picker>`;
    }
    return html``;
  }

  private _targetPicked(ev) {
    ev.stopPropagation();
    if (!ev.detail.value) {
      return;
    }
    const value = ev.detail.value;
    const target = ev.currentTarget;
    target.value = "";
    this._addMode = undefined;
    fireEvent(this, "value-changed", {
      value: this.value
        ? {
            ...this.value,
            [target.type]: this.value[target.type]
              ? [...ensureArray(this.value[target.type]), value]
              : value,
          }
        : { [target.type]: value },
    });
  }

  private _handleExpand(ev) {
    const target = ev.currentTarget as any;
    const newDevices: string[] = [];
    const newEntities: string[] = [];
    if (target.type === "area_id") {
      Object.values(this._devices!).forEach((device) => {
        if (
          device.area_id === target.id &&
          !this.value!.device_id?.includes(device.id) &&
          this._deviceMeetsFilter(device)
        ) {
          newDevices.push(device.id);
        }
      });
      this._entities!.forEach((entity) => {
        if (
          entity.area_id === target.id &&
          !this.value!.entity_id?.includes(entity.entity_id) &&
          this._entityRegMeetsFilter(entity)
        ) {
          newEntities.push(entity.entity_id);
        }
      });
    } else if (target.type === "device_id") {
      this._entities!.forEach((entity) => {
        if (
          entity.device_id === target.id &&
          !this.value!.entity_id?.includes(entity.entity_id) &&
          this._entityRegMeetsFilter(entity)
        ) {
          newEntities.push(entity.entity_id);
        }
      });
    } else {
      return;
    }
    let value = this.value;
    if (newEntities.length) {
      value = this._addItems(value, "entity_id", newEntities);
    }
    if (newDevices.length) {
      value = this._addItems(value, "device_id", newDevices);
    }
    value = this._removeItem(value, target.type, target.id);
    fireEvent(this, "value-changed", { value });
  }

  private _handleRemove(ev) {
    const target = ev.currentTarget as any;
    fireEvent(this, "value-changed", {
      value: this._removeItem(this.value, target.type, target.id),
    });
  }

  private _addItems(
    value: this["value"],
    type: string,
    ids: string[]
  ): this["value"] {
    return {
      ...value,
      [type]: value![type] ? ensureArray(value![type])!.concat(ids) : ids,
    };
  }

  private _removeItem(
    value: this["value"],
    type: string,
    id: string
  ): this["value"] {
    const newVal = ensureArray(value![type])!.filter(
      (val) => String(val) !== id
    );
    if (newVal.length) {
      return {
        ...value,
        [type]: newVal,
      };
    }
    const val = { ...value }!;
    delete val[type];
    if (Object.keys(val).length) {
      return val;
    }
    return undefined;
  }

  private _deviceMeetsFilter(device: DeviceRegistryEntry): boolean {
    const devEntities = this._entities?.filter(
      (entity) => entity.device_id === device.id
    );
    if (this.includeDomains) {
      if (!devEntities || !devEntities.length) {
        return false;
      }
      if (
        !devEntities.some((entity) =>
          this.includeDomains!.includes(computeDomain(entity.entity_id))
        )
      ) {
        return false;
      }
    }

    if (this.includeDeviceClasses) {
      if (!devEntities || !devEntities.length) {
        return false;
      }
      if (
        !devEntities.some((entity) => {
          const stateObj = this.hass.states[entity.entity_id];
          if (!stateObj) {
            return false;
          }
          return (
            stateObj.attributes.device_class &&
            this.includeDeviceClasses!.includes(
              stateObj.attributes.device_class
            )
          );
        })
      ) {
        return false;
      }
    }

    if (this.deviceFilter) {
      return this.deviceFilter(device);
    }
    return true;
  }

  private _entityRegMeetsFilter(entity: EntityRegistryEntry): boolean {
    if (
      this.includeDomains &&
      !this.includeDomains.includes(computeDomain(entity.entity_id))
    ) {
      return false;
    }
    if (this.includeDeviceClasses) {
      const stateObj = this.hass.states[entity.entity_id];
      if (!stateObj) {
        return false;
      }
      if (
        !stateObj.attributes.device_class ||
        !this.includeDeviceClasses!.includes(stateObj.attributes.device_class)
      ) {
        return false;
      }
    }
    if (this.entityRegFilter) {
      return this.entityRegFilter(entity);
    }
    return true;
  }

  static get styles(): CSSResultGroup {
    return css`
      .expand-btn {
        margin-right: 0;
      }
      ha-chip {
        --ha-chip-icon-color: var(--secondary-text-color);
        --ha-chip-text-color: var(--primary-text-color);
      }
      ha-chip:hover {
        z-index: 5;
      }
      ha-icon-button {
        --mdc-icon-size: 18px;
        --mdc-icon-button-size: 24px;
        color: var(--secondary-text-color);
        outline: none;
      }
      ha-chip > div {
        margin-right: -8px;
        display: inline-flex;
        align-items: center;
      }
      ha-chip.area_id {
        --ha-chip-background-color: #fed6a4;
      }
      ha-chip.device_id {
        --ha-chip-background-color: #a8e1fb;
      }
      ha-chip.entity_id {
        --ha-chip-background-color: #d2e7b9;
      }
      paper-tooltip.expand {
        min-width: 200px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-target-picker": HaTargetPicker;
  }
}
