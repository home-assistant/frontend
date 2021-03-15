import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button/mwc-icon-button";
import { mdiRefresh } from "@mdi/js";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  TemplateResult,
} from "lit-element";
import "../../../../../components/ha-card";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-switch";
import {
  fetchNodeConfigParameters,
  ZWaveJSNode,
  ZWaveJSNodeConfigParams,
} from "../../../../../data/zwave_js";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import { configTabs } from "./zwave_js-config-router";
import {
  DeviceRegistryEntry,
  computeDeviceName,
} from "../../../../../data/device_registry";

@customElement("zwave_js-node-config")
class ZWaveJSNodeConfig extends LitElement {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @property({ type: Number }) public nodeId?: number;

  @property() public deviceId?: string;

  @property() public devices!: DeviceRegistryEntry[];

  // @internalProperty() private _node?: ZWaveJSNode;

  @internalProperty() private _device?: DeviceRegistryEntry;

  @internalProperty() private _config?: ZWaveJSNodeConfigParams[];

  protected firstUpdated() {
    if (this.hass) {
      this._fetchData();
    }
  }

  protected render(): TemplateResult {
    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${configTabs}
      >
        <mwc-icon-button slot="toolbar-icon" @click=${this._fetchData}>
          <ha-svg-icon .path=${mdiRefresh}></ha-svg-icon>
        </mwc-icon-button>
        <ha-config-section .narrow=${this.narrow} .isWide=${this.isWide}>
          <div slot="header">
            ${this.hass.localize("ui.panel.config.zwave_js.node_config.header")}
          </div>

          <div slot="introduction">
            ${this._device
              ? html`
                  <div class="device-info">
                    <h2>${computeDeviceName(this._device, this.hass)}</h2>
                    <p>${this._device.manufacturer} ${this._device.model}</p>
                  </div>
                `
              : ``}
            ${this.hass.localize(
              "ui.panel.config.zwave_js.node_config.introduction"
            )}
            <p>
              <em
                >${this.hass.localize(
                  "ui.panel.config.zwave_js.node_config.attribution",
                  "device_database",
                  html`<a href="https://devices.zwave-js.io/" target="_blank"
                    >${this.hass.localize(
                      "ui.panel.config.zwave_js.node_config.zwave_js_device_database"
                    )}</a
                  >`
                )}</em
              >
            </p>
          </div>
          ${this._config
            ? html`
                ${Object.entries(this._config).map(
                  ([id, item]) => html` <ha-card
                    class="content config-item"
                    .configId=${id}
                  >
                    <div class="card-content">
                      ${this._generateConfigBox(id, item)}
                    </div>
                  </ha-card>`
                )}
              `
            : ``}
        </ha-config-section>
      </hass-tabs-subpage>
    `;
  }

  private _generateConfigBox(id, item) {
    const labelAndDescription = html`
      <div class="config-label">
        <b>${item.metadata.label}</b><br />
        <span class="secondary">
          ${item.metadata.description}
        </span>
      </div>
    `;

    // Numeric entries with a min value of 0 and max of 1 are considered boolean
    if (
      (item.configuration_value_type === "range" &&
        item.metadata.min === 0 &&
        item.metadata.max === 1) ||
      this._isEnumeratedBool(item)
    ) {
      return html`
        <div class="flex">
          ${labelAndDescription}
          <div class="toggle">
            <ha-switch
              .property=${item.property}
              .propertyKey=${item.property_key}
              .checked=${item.value === 1}
              @change=${this._switchToggled}
            ></ha-switch>
          </div>
        </div>
      `;
    }

    if (item.configuration_value_type === "range") {
      return html`${labelAndDescription}
        <paper-input
          type="number"
          .value=${item.value}
          .min=${item.metadata.min}
          .max=${item.metadata.max}
        >
        </paper-input> `;
    }

    if (item.configuration_value_type === "enumerated") {
      return html`
        ${labelAndDescription}
        <div class="flex">
          <paper-dropdown-menu dynamic-align>
            <paper-listbox
              slot="dropdown-content"
              .selected=${item.value}
              .key=${id}
              .property=${item.property}
              .propertyKey=${item.property_key}
              @iron-select=${this._dropdownSelected}
            >
              ${Object.entries(item.metadata.states).map(
                ([key, state]) => html`
                  <paper-item .id=${key}>${state}</paper-item>
                `
              )}
            </paper-listbox>
          </paper-dropdown-menu>
        </div>
      `;
    }

    return html`${labelAndDescription}
      <p>${item.value}</p>`;
  }

  private _isEnumeratedBool(item) {
    // Some Z-Wave config values use a states list with two options where index 0 = Disabled and 1 = Enabled
    // We want those to be considered boolean and show a toggle switch
    const disabledStates = ["disable", "disabled"];
    const enabledStates = ["enable", "enabled"];

    if (item.configuration_value_type !== "enumerated") {
      return false;
    }
    if (!("states" in item.metadata)) {
      return false;
    }
    if (!(0 in item.metadata.states) || !(1 in item.metadata.states)) {
      return false;
    }
    if (
      disabledStates.includes(item.metadata.states[0].toLowerCase()) &&
      enabledStates.includes(item.metadata.states[1].toLowerCase())
    ) {
      return true;
    }
    return false;
  }

  private _switchToggled(ev) {
    const data = {
      type: "zwave_js/set_config_parameter",
      entry_id: this.configEntryId,
      node_id: this.nodeId,
      property: ev.target.property,
      value: ev.target.checked ? 1 : 0,
    };

    if (ev.target.propertyKey !== null) {
      data.property_key = ev.target.propertyKey;
    }

    this.hass.callWS(data);
  }

  private _dropdownSelected(ev) {
    if (ev.target === undefined || this._config[ev.target.key] === undefined) {
      return;
    }
    if (this._config[ev.target.key].value === ev.target.selected) {
      return;
    }

    const data = {
      type: "zwave_js/set_config_parameter",
      entry_id: this.configEntryId,
      node_id: this.nodeId,
      property: ev.target.property,
      value: ev.target.selected,
    };

    if (ev.target.propertyKey !== null) {
      data.property_key = ev.target.propertyKey;
    }

    this.hass.callWS(data);
  }

  private async _fetchData() {
    if (!this.configEntryId) {
      return;
    }

    this._device = this.devices
      ? this.devices.find((device) => device.id === this.deviceId)
      : undefined;

    if (!this._device) {
      return;
    }

    const identifier = this._device.identifiers.find(
      (ident) => ident[0] === "zwave_js"
    );

    if (!identifier) {
      return;
    }

    this.nodeId = parseInt(identifier[1].split("-")[1]);

    this._config = await fetchNodeConfigParameters(
      this.hass,
      this.configEntryId,
      this.nodeId
    );
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        .secondary {
          color: var(--secondary-text-color);
        }

        .tech-info {
          font-size: 0.8em;
          text-transform: uppercase;
        }

        .flex {
          display: flex;
        }

        .flex .config-label,
        .flex paper-dropdown-menu {
          flex: 1;
        }

        .flex .tech-info,
        .flex .toggle {
          width: 80px;
          text-align: right;
        }

        .content {
          margin-top: 24px;
        }

        .device-info h2 {
          margin-bottom: 0px;
        }

        .device-info p {
          margin-top: 0px;
        }

        .sectionHeader {
          position: relative;
          padding-right: 40px;
        }

        ha-card {
          margin: 0 auto;
          max-width: 600px;
        }

        ha-card:last-child {
          margin-bottom: 24px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-node-config": ZWaveJSNodeConfig;
  }
}
