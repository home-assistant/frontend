/* eslint-disable lit/no-template-arrow */
import { HassEntity } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import { computeDomain } from "../../../../common/entity/compute_domain";
import { applyPatch, getPath } from "../../../../common/util/patch";
import "../../../../components/device/ha-area-devices-picker";
import "../../../../components/entity/ha-entity-picker";
import {
  AreaRegistryEntry,
  subscribeAreaRegistry,
} from "../../../../data/area_registry";
import {
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../../data/device_registry";
import { subscribeEntityRegistry } from "../../../../data/entity_registry";
import { domainToName } from "../../../../data/integration";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { haStyleDialog } from "../../../../resources/styles";
import { HomeAssistant } from "../../../../types";
import { Placeholder, PlaceholderContainer } from "./dialog-thingtalk";

declare global {
  // for fire event
  interface HASSDomEvents {
    "placeholders-filled": { value: PlaceholderValues };
  }
}

export interface PlaceholderValues {
  [key: string]: {
    [index: number]: {
      [index: number]: { device_id?: string; entity_id?: string };
    };
  };
}

export interface ExtraInfo {
  [key: string]: {
    [index: number]: {
      [index: number]: {
        area_id?: string;
        device_ids?: string[];
        manualEntity: boolean;
      };
    };
  };
}

interface DeviceEntitiesLookup {
  [deviceId: string]: string[];
}

@customElement("ha-thingtalk-placeholders")
export class ThingTalkPlaceholders extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public opened!: boolean;

  public skip!: () => void;

  @property() public placeholders!: PlaceholderContainer;

  @state() private _error?: string;

  private _deviceEntityLookup: DeviceEntitiesLookup = {};

  @state() private _extraInfo: ExtraInfo = {};

  @state() private _placeholderValues: PlaceholderValues = {};

  private _devices?: DeviceRegistryEntry[];

  private _areas?: AreaRegistryEntry[];

  private _search = false;

  public hassSubscribe() {
    return [
      subscribeEntityRegistry(this.hass.connection, (entries) => {
        for (const entity of entries) {
          if (!entity.device_id) {
            continue;
          }
          if (!(entity.device_id in this._deviceEntityLookup)) {
            this._deviceEntityLookup[entity.device_id] = [];
          }
          if (
            !this._deviceEntityLookup[entity.device_id].includes(
              entity.entity_id
            )
          ) {
            this._deviceEntityLookup[entity.device_id].push(entity.entity_id);
          }
        }
      }),
      subscribeDeviceRegistry(this.hass.connection!, (devices) => {
        this._devices = devices;
        this._searchNames();
      }),
      subscribeAreaRegistry(this.hass.connection!, (areas) => {
        this._areas = areas;
        this._searchNames();
      }),
    ];
  }

  protected updated(changedProps: PropertyValues) {
    if (changedProps.has("placeholders")) {
      this._search = true;
      this._searchNames();
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-dialog
        open
        scrimClickAction
        .heading=${this.hass.localize(
          `ui.panel.config.automation.thingtalk.link_devices.header`
        )}
      >
        <div>
          ${this._error ? html` <div class="error">${this._error}</div> ` : ""}
          ${Object.entries(this.placeholders).map(
            ([type, placeholders]) =>
              html`
                <h3>
                  ${this.hass.localize(
                    `ui.panel.config.automation.editor.${type}s.name`
                  )}:
                </h3>
                ${placeholders.map((placeholder) => {
                  if (placeholder.fields.includes("device_id")) {
                    const extraInfo = getPath(this._extraInfo, [
                      type,
                      placeholder.index,
                    ]);
                    return html`
                      <ha-area-devices-picker
                        .type=${type}
                        .placeholder=${placeholder}
                        @value-changed=${this._devicePicked}
                        .hass=${this.hass}
                        .area=${extraInfo ? extraInfo.area_id : undefined}
                        .devices=${extraInfo && extraInfo.device_ids
                          ? extraInfo.device_ids
                          : undefined}
                        .includeDomains=${placeholder.domains}
                        .includeDeviceClasses=${placeholder.device_classes}
                        .label=${this._getLabel(
                          placeholder.domains,
                          placeholder.device_classes
                        )}
                      ></ha-area-devices-picker>
                      ${extraInfo && extraInfo.manualEntity
                        ? html`
                            <h3>
                              ${this.hass.localize(
                                `ui.panel.config.automation.thingtalk.link_devices.ambiguous_entities`
                              )}
                            </h3>
                            ${Object.keys(extraInfo.manualEntity).map(
                              (idx) => html`
                                <ha-entity-picker
                                  id="device-entity-picker"
                                  .type=${type}
                                  .placeholder=${placeholder}
                                  .index=${idx}
                                  @change=${this._entityPicked}
                                  .includeDomains=${placeholder.domains}
                                  .includeDeviceClasses=${placeholder.device_classes}
                                  .hass=${this.hass}
                                  .label=${`${this._getLabel(
                                    placeholder.domains,
                                    placeholder.device_classes
                                  )} of device ${this._getDeviceName(
                                    getPath(this._placeholderValues, [
                                      type,
                                      placeholder.index,
                                      idx,
                                      "device_id",
                                    ])
                                  )}`}
                                  .entityFilter=${(entityState: HassEntity) => {
                                    const devId =
                                      this._placeholderValues[type][
                                        placeholder.index
                                      ][idx].device_id;
                                    return this._deviceEntityLookup[
                                      devId
                                    ].includes(entityState.entity_id);
                                  }}
                                ></ha-entity-picker>
                              `
                            )}
                          `
                        : ""}
                    `;
                  }
                  if (placeholder.fields.includes("entity_id")) {
                    return html`
                      <ha-entity-picker
                        .type=${type}
                        .placeholder=${placeholder}
                        @change=${this._entityPicked}
                        .includeDomains=${placeholder.domains}
                        .includeDeviceClasses=${placeholder.device_classes}
                        .hass=${this.hass}
                        .label=${this._getLabel(
                          placeholder.domains,
                          placeholder.device_classes
                        )}
                      ></ha-entity-picker>
                    `;
                  }
                  return html`
                    <div class="error">
                      ${this.hass.localize(
                        `ui.panel.config.automation.thingtalk.link_devices.unknown_placeholder`
                      )}<br />
                      ${placeholder.domains}<br />
                      ${placeholder.fields.map(
                        (field) => html` ${field}<br /> `
                      )}
                    </div>
                  `;
                })}
              `
          )}
        </div>
        <mwc-button @click=${this.skip} slot="secondaryAction">
          ${this.hass.localize(`ui.common.skip`)}
        </mwc-button>
        <mwc-button
          @click=${this._done}
          .disabled=${!this._isDone}
          slot="primaryAction"
        >
          ${this.hass.localize(`ui.panel.config.automation.thingtalk.create`)}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _getDeviceName(deviceId: string): string {
    if (!this._devices) {
      return "";
    }
    const foundDevice = this._devices.find((device) => device.id === deviceId);
    if (!foundDevice) {
      return "";
    }
    return foundDevice.name_by_user || foundDevice.name || "";
  }

  private _searchNames() {
    if (!this._search || !this._areas || !this._devices) {
      return;
    }
    this._search = false;
    Object.entries(this.placeholders).forEach(([type, placeholders]) =>
      placeholders.forEach((placeholder) => {
        if (!placeholder.name) {
          return;
        }
        const name = placeholder.name;
        const foundArea = this._areas!.find((area) =>
          area.name.toLowerCase().includes(name)
        );
        if (foundArea) {
          applyPatch(
            this._extraInfo,
            [type, placeholder.index, "area_id"],
            foundArea.area_id
          );
          this.requestUpdate("_extraInfo");
          return;
        }
        const foundDevices = this._devices!.filter((device) => {
          const deviceName = device.name_by_user || device.name;
          if (!deviceName) {
            return false;
          }
          return deviceName.toLowerCase().includes(name);
        });
        if (foundDevices.length) {
          applyPatch(
            this._extraInfo,
            [type, placeholder.index, "device_ids"],
            foundDevices.map((device) => device.id)
          );
          this.requestUpdate("_extraInfo");
        }
      })
    );
  }

  private get _isDone(): boolean {
    return Object.entries(this.placeholders).every(([type, placeholders]) =>
      placeholders.every((placeholder) =>
        placeholder.fields.every((field) => {
          const entries: {
            [key: number]: { device_id?: string; entity_id?: string };
          } = getPath(this._placeholderValues, [type, placeholder.index]);
          if (!entries) {
            return false;
          }
          const values = Object.values(entries);
          return values.every(
            (entry) => entry[field] !== undefined && entry[field] !== ""
          );
        })
      )
    );
  }

  private _getLabel(domains: string[], deviceClasses?: string[]) {
    return `${domains
      .map((domain) => domainToName(this.hass.localize, domain))
      .join(", ")}${
      deviceClasses ? ` of type ${deviceClasses.join(", ")}` : ""
    }`;
  }

  private _devicePicked(ev: CustomEvent): void {
    const value: string[] = ev.detail.value;
    if (!value) {
      return;
    }
    const target = ev.target as any;
    const placeholder = target.placeholder as Placeholder;
    const type = target.type;

    let oldValues = getPath(this._placeholderValues, [type, placeholder.index]);
    if (oldValues) {
      oldValues = Object.values(oldValues);
    }
    const oldExtraInfo = getPath(this._extraInfo, [type, placeholder.index]);

    if (this._placeholderValues[type]) {
      delete this._placeholderValues[type][placeholder.index];
    }

    if (this._extraInfo[type]) {
      delete this._extraInfo[type][placeholder.index];
    }

    if (!value.length) {
      this.requestUpdate("_placeholderValues");
      return;
    }

    value.forEach((deviceId, index) => {
      let oldIndex;
      if (oldValues) {
        const oldDevice = oldValues.find((oldVal, idx) => {
          oldIndex = idx;
          return oldVal.device_id === deviceId;
        });

        if (oldDevice) {
          applyPatch(
            this._placeholderValues,
            [type, placeholder.index, index],
            oldDevice
          );
          if (oldExtraInfo) {
            applyPatch(
              this._extraInfo,
              [type, placeholder.index, index],
              oldExtraInfo[oldIndex]
            );
          }
          return;
        }
      }

      applyPatch(
        this._placeholderValues,
        [type, placeholder.index, index, "device_id"],
        deviceId
      );

      if (!placeholder.fields.includes("entity_id")) {
        return;
      }

      const devEntities = this._deviceEntityLookup[deviceId];

      const entities = devEntities.filter((eid) => {
        if (placeholder.device_classes) {
          const stateObj = this.hass.states[eid];
          if (!stateObj) {
            return false;
          }
          return (
            placeholder.domains.includes(computeDomain(eid)) &&
            stateObj.attributes.device_class &&
            placeholder.device_classes.includes(
              stateObj.attributes.device_class
            )
          );
        }
        return placeholder.domains.includes(computeDomain(eid));
      });
      if (entities.length === 0) {
        // Should not happen because we filter the device picker on domain
        this._error = `No ${placeholder.domains
          .map((domain) => domainToName(this.hass.localize, domain))
          .join(", ")} entities found in this device.`;
      } else if (entities.length === 1) {
        applyPatch(
          this._placeholderValues,
          [type, placeholder.index, index, "entity_id"],
          entities[0]
        );
        this.requestUpdate("_placeholderValues");
      } else {
        delete this._placeholderValues[type][placeholder.index][index]
          .entity_id;
        applyPatch(
          this._extraInfo,
          [type, placeholder.index, "manualEntity", index],
          true
        );
        this.requestUpdate("_placeholderValues");
      }
    });
  }

  private _entityPicked(ev: Event): void {
    const target = ev.target as any;
    const placeholder = target.placeholder as Placeholder;
    const value = target.value;
    const type = target.type;
    const index = target.index || 0;
    applyPatch(
      this._placeholderValues,
      [type, placeholder.index, index, "entity_id"],
      value
    );
    this.requestUpdate("_placeholderValues");
  }

  private _done(): void {
    fireEvent(this, "placeholders-filled", { value: this._placeholderValues });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          max-width: 500px;
        }
        mwc-button.left {
          margin-right: auto;
        }
        h3 {
          margin: 10px 0 0 0;
          font-weight: 500;
        }
        .error {
          color: var(--error-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-thingtalk-placeholders": ThingTalkPlaceholders;
  }
}
