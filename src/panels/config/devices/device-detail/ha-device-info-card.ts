import { consume } from "@lit/context";
import type { CSSResultGroup, TemplateResult } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../../../../common/config/is_component_loaded";
import { computeDeviceNameDisplay } from "../../../../common/entity/compute_device_name";
import { stringCompare } from "../../../../common/string/compare";
import { titleCase } from "../../../../common/string/title-case";
import { createSearchParam } from "../../../../common/url/search-params";
import "../../../../components/ha-card";
import "../../../../components/ha-icon";
import "../../../../components/ha-label";
import type { DeviceRegistryEntry } from "../../../../data/device/device_registry";
import type { LabelRegistryEntry } from "../../../../data/label/label_registry";
import { labelsContext } from "../../../../data/context";
import { haStyle } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";

@customElement("ha-device-info-card")
export class HaDeviceCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @property({ type: Boolean }) public narrow = false;

  @consume({ context: labelsContext, subscribe: true })
  @state()
  private _labelRegistry?: LabelRegistryEntry[];

  private _labelsData = memoizeOne(
    (
      labels: LabelRegistryEntry[] | undefined,
      labelIds: string[],
      language: string
    ): {
      map: Map<string, LabelRegistryEntry>;
      ids: string[];
    } => {
      const map = labels
        ? new Map(labels.map((label) => [label.label_id, label]))
        : new Map<string, LabelRegistryEntry>();
      const ids = [...labelIds].sort((labelA, labelB) =>
        stringCompare(
          map.get(labelA)?.name || labelA,
          map.get(labelB)?.name || labelB,
          language
        )
      );
      return { map, ids };
    }
  );

  protected render(): TemplateResult {
    const { map: labelMap, ids: labels } = this._labelsData(
      this._labelRegistry,
      this.device.labels,
      this.hass.locale.language
    );

    return html`
      <ha-card
        outlined
        .header=${this.hass.localize("ui.panel.config.devices.device_info", {
          type: this.hass.localize(
            `ui.panel.config.devices.type.${
              this.device.entry_type || "device"
            }_heading`
          ),
        })}
      >
        <div class="card-content">
          ${this.device.model
            ? html`<div class="model">
                ${this.device.model}
                ${this.device.model_id ? html`(${this.device.model_id})` : ""}
              </div>`
            : this.device.model_id
              ? html`<div class="model">${this.device.model_id}</div>`
              : ""}
          ${this.device.manufacturer
            ? html`
                <div class="manuf">
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.manuf",
                    { manufacturer: this.device.manufacturer }
                  )}
                </div>
              `
            : ""}
          ${this.device.via_device_id
            ? html`
                <div class="extra-info">
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.via"
                  )}
                  <span class="hub"
                    ><a
                      href="/config/devices/device/${this.device.via_device_id}"
                      >${this._computeDeviceNameDisplay(
                        this.device.via_device_id
                      )}</a
                    ></span
                  >
                </div>
              `
            : ""}
          ${this.device.sw_version
            ? html`
                <div class="extra-info">
                  ${this.hass.localize(
                    `ui.panel.config.integrations.config_entry.${
                      this.device.entry_type === "service" &&
                      !this.device.hw_version
                        ? "version"
                        : "firmware"
                    }`,
                    { version: this.device.sw_version }
                  )}
                </div>
              `
            : ""}
          ${this.device.hw_version
            ? html`
                <div class="extra-info">
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.hardware",
                    { version: this.device.hw_version }
                  )}
                </div>
              `
            : ""}
          ${this.device.serial_number
            ? html`
                <div class="extra-info">
                  ${this.hass.localize(
                    "ui.panel.config.integrations.config_entry.serial_number",
                    { serial_number: this.device.serial_number }
                  )}
                </div>
              `
            : ""}
          ${this._getAddresses().map(
            ([type, value]) => html`
              <div class="extra-info">
                ${type === "bluetooth" &&
                isComponentLoaded(this.hass.config, "bluetooth")
                  ? html`${titleCase(type)}:
                      <a
                        href="/config/bluetooth/advertisement-monitor?${createSearchParam(
                          { address: value }
                        )}"
                        >${value.toUpperCase()}</a
                      >`
                  : type === "mac" && isComponentLoaded(this.hass.config, "dhcp")
                    ? html`MAC:
                        <a
                          href="/config/dhcp?${createSearchParam({
                            mac_address: value,
                          })}"
                          >${value.toUpperCase()}</a
                        >`
                    : html`${type === "mac" ? "MAC" : titleCase(type)}:
                      ${value.toUpperCase()}`}
              </div>
            `
          )}
          ${labels.length > 0
            ? html`
                <div class="extra-info labels">
                  ${labels.map((labelId) => {
                    const label = labelMap.get(labelId);
                    return html`
                      <ha-label
                        .color=${label?.color}
                        .description=${label?.description}
                      >
                        ${label?.icon
                          ? html`<ha-icon
                              slot="icon"
                              .icon=${label.icon}
                            ></ha-icon>`
                          : nothing}
                        ${label?.name || labelId}
                      </ha-label>
                    `;
                  })}
                </div>
              `
            : nothing}

          <slot></slot>
        </div>
        <slot name="actions"></slot>
      </ha-card>
    `;
  }

  protected _getAddresses() {
    return this.device.connections.filter((conn) =>
      ["mac", "bluetooth", "zigbee"].includes(conn[0])
    );
  }

  private _computeDeviceNameDisplay(deviceId: string) {
    const device = this.hass.devices[deviceId];
    return device
      ? computeDeviceNameDisplay(device, this.hass.localize, this.hass.states)
      : `<${this.hass.localize(
          "ui.panel.config.integrations.config_entry.unknown_via_device"
        )}>`;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        :host {
          display: block;
        }
        ha-card {
          flex: 1 0 100%;
          min-width: 0;
        }
        .device {
          width: 30%;
        }
        .labels {
          display: flex;
          flex-wrap: wrap;
          gap: var(--ha-space-1);
          width: 100%;
          max-width: 100%;
        }
        .labels ha-label {
          min-width: 0;
          max-width: 100%;
          flex: 0 1 auto;
        }
        .extra-info {
          margin-top: var(--ha-space-2);
          word-wrap: break-word;
        }
        .manuf,
        .model {
          color: var(--secondary-text-color);
          word-wrap: break-word;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-info-card": HaDeviceCard;
  }
}
