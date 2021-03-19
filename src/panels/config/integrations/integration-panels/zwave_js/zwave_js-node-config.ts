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
import { debounce } from "../../../../../common/util/debounce";
import "../../../../../components/ha-card";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-switch";
import {
  fetchNodeConfigParameters,
  setNodeConfigParameter,
  ZWaveJSNodeConfigParams,
  ZWaveJSSetConfigParamData,
} from "../../../../../data/zwave_js";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import { configTabs } from "./zwave_js-config-router";
import {
  DeviceRegistryEntry,
  computeDeviceName,
  subscribeDeviceRegistry,
} from "../../../../../data/device_registry";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import memoizeOne from "memoize-one";

@customElement("zwave_js-node-config")
class ZWaveJSNodeConfig extends SubscribeMixin(LitElement) {
  @property({ type: Object }) public hass!: HomeAssistant;

  @property({ type: Object }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @property({ type: Number }) public nodeId?: number;

  @property() public deviceId?: string;

  @property({ type: Array })
  private _deviceRegistryEntries?: DeviceRegistryEntry[];

  @internalProperty() private _device?: DeviceRegistryEntry;

  @internalProperty() private _config?: ZWaveJSNodeConfigParams[];

  protected firstUpdated() {
    if (this.hass) {
      this._fetchData();
    }
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeDeviceRegistry(this.hass.connection, (entries) => {
        this._deviceRegistryEntries = entries;
      }),
    ];
  }

  protected updated() {
    if (!this.hass || !this._deviceRegistryEntries) {
      return;
    }
    if (!this._device && this._deviceRegistryEntries.length > 0) {
      this._fetchData();
    }
  }

  protected render(): TemplateResult {
    if (!this._device) {
      return html`<hass-error-screen
        .hass=${this.hass}
        .error=${this.hass.localize(
          "ui.panel.config.zwave_js.node_config.error_device_not_found"
        )}
      ></hass-error-screen>`;
    }

    if (!this.nodeId) {
      return html`<hass-error-screen
        .hass=${this.hass}
        .error=${this.hass.localize(
          "ui.panel.config.zwave_js.node_config.error_couldnt_determine_node_from_device"
        )}
      ></hass-error-screen>`;
    }

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
              <em>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.node_config.attribution",
                  "device_database",
                  html`<a href="https://devices.zwave-js.io/" target="_blank"
                    >${this.hass.localize(
                      "ui.panel.config.zwave_js.node_config.zwave_js_device_database"
                    )}</a
                  >`
                )}
              </em>
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
          ${item.metadata.description !== null && !item.metadata.writeable
            ? html`<br />`
            : ""}
          ${!item.metadata.writeable
            ? html`<em
                >${this.hass.localize(
                  "ui.panel.config.zwave_js.node_config.parameter_is_read_only"
                )}</em
              >`
            : ""}
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
              .key=${id}
              @change=${this._switchToggled}
              .disabled=${!item.metadata.writeable}
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
          .property=${item.property}
          .propertyKey=${item.property_key}
          .key=${id}
          .disabled=${!item.metadata.writeable}
          @value-changed=${this._numericInputChanged}
        >
        </paper-input> `;
    }

    if (item.configuration_value_type === "enumerated") {
      return html`
        ${labelAndDescription}
        <div class="flex">
          <paper-dropdown-menu
            dynamic-align
            .disabled=${!item.metadata.writeable}
          >
            <paper-listbox
              slot="dropdown-content"
              .selected=${item.value}
              attr-for-selected="value"
              .key=${id}
              .property=${item.property}
              .propertyKey=${item.property_key}
              @iron-select=${this._dropdownSelected}
            >
              ${Object.entries(item.metadata.states).map(
                ([key, state]) => html`
                  <paper-item .value=${key}>${state}</paper-item>
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
    this._updateConfigParameter(ev.target, ev.target.checked ? 1 : 0);
  }

  private _dropdownSelected(ev) {
    if (ev.target === undefined || this._config![ev.target.key] === undefined) {
      return;
    }
    if (this._config![ev.target.key].value === ev.target.selected) {
      return;
    }

    this._updateConfigParameter(ev.target, parseInt(ev.target.selected));
  }

  private debouncedUpdate = debounce((target) => {
    const value = parseInt(target.value);
    this._config![target.key].value = value;

    this._updateConfigParameter(target, value);
  }, 1000);

  private _numericInputChanged(ev) {
    if (ev.target === undefined || this._config![ev.target.key] === undefined) {
      return;
    }
    if (this._config![ev.target.key].value === parseInt(ev.target.value)) {
      return;
    }
    this.debouncedUpdate(ev.target);
  }

  private _updateConfigParameter(target, value) {
    setNodeConfigParameter(
      this.hass,
      this.configEntryId!,
      this.nodeId!,
      target.property,
      value,
      target.propertyKey ? target.propertyKey : null
    );
    this._config![target.key].value = value;
  }

  private async _fetchData() {
    if (!this.configEntryId || !this._deviceRegistryEntries) {
      return;
    }

    const getDevice = memoizeOne((entries, deviceId) =>
      entries.find((device) => device.id === deviceId)
    );

    this._device = this._deviceRegistryEntries
      ? getDevice(this._deviceRegistryEntries, this.deviceId)
      : undefined;

    if (!this._device) {
      return;
    }
    const getIdentifier = memoizeOne((device) =>
      device.identifiers.find((ident) => ident[0] === "zwave_js")
    );

    const identifier = getIdentifier(this._device);

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
