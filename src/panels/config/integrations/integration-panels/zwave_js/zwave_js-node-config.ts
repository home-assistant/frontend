import {
  mdiCheckCircle,
  mdiCircle,
  mdiProgressClock,
  mdiCloseCircle,
} from "@mdi/js";
import "../../../../../components/ha-settings-row";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@material/mwc-button/mwc-button";
import "@material/mwc-icon-button/mwc-icon-button";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
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
import { classMap } from "lit-html/directives/class-map";

const getDevice = memoizeOne(
  (
    deviceId: string,
    entries?: DeviceRegistryEntry[]
  ): DeviceRegistryEntry | undefined =>
    entries?.find((device) => device.id === deviceId)
);

const getNodeId = memoizeOne((device: DeviceRegistryEntry):
  | number
  | undefined => {
  const identifier = device.identifiers.find(
    (ident) => ident[0] === "zwave_js"
  );
  if (!identifier) {
    return undefined;
  }

  return parseInt(identifier[1].split("-")[1]);
});

@customElement("zwave_js-node-config")
class ZWaveJSNodeConfig extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow!: boolean;

  @property({ type: Boolean }) public isWide!: boolean;

  @property() public configEntryId?: string;

  @property() public deviceId!: string;

  @property({ type: Array })
  private _deviceRegistryEntries?: DeviceRegistryEntry[];

  @internalProperty() private _config?: ZWaveJSNodeConfigParams;

  @internalProperty() private _error?: string;

  public connectedCallback(): void {
    super.connectedCallback();
    this.deviceId = this.route.path.substr(1);
  }

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      subscribeDeviceRegistry(this.hass.connection, (entries) => {
        this._deviceRegistryEntries = entries;
      }),
    ];
  }

  protected updated(changedProps: PropertyValues): void {
    if (
      (!this._config || changedProps.has("deviceId")) &&
      changedProps.has("_deviceRegistryEntries")
    ) {
      this._fetchData();
    }
  }

  protected render(): TemplateResult {
    if (this._error) {
      return html`<hass-error-screen
        .hass=${this.hass}
        .error=${this.hass.localize(
          `ui.panel.config.zwave_js.node_config.error_${this._error}`
        )}
      ></hass-error-screen>`;
    }

    if (!this._config) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }

    const device = this._device!;

    return html`
      <hass-tabs-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
        .tabs=${configTabs}
      >
        <ha-config-section .narrow=${this.narrow} .isWide=${this.isWide}>
          <div slot="header">
            ${this.hass.localize("ui.panel.config.zwave_js.node_config.header")}
          </div>

          <div slot="introduction">
            ${device
              ? html`
                  <div class="device-info">
                    <h2>${computeDeviceName(device, this.hass)}</h2>
                    <p>${device.manufacturer} ${device.model}</p>
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
          <ha-card>
            ${this._config
              ? html`
                  ${Object.entries(this._config).map(
                    ([id, item]) => html` <ha-settings-row
                      class="content config-item"
                      .configId=${id}
                      .narrow=${this.narrow}
                    >
                      ${this._generateConfigBox(id, item)}
                    </ha-settings-row>`
                  )}
                `
              : ``}
          </ha-card>
        </ha-config-section>
      </hass-tabs-subpage>
    `;
  }

  private _generateConfigBox(id, item): TemplateResult {
    const icons = {
      accepted: mdiCheckCircle,
      queued: mdiProgressClock,
      error: mdiCloseCircle,
    };
    const labelAndDescription = html`
      <span slot="heading">${item.metadata.label}</span>
      <span slot="description">
        ${item.metadata.description}
        ${item.metadata.description !== null && !item.metadata.writeable
          ? html`<br />`
          : ""}
        ${!item.metadata.writeable
          ? html`<em>
              ${this.hass.localize(
                "ui.panel.config.zwave_js.node_config.parameter_is_read_only"
              )}
            </em>`
          : ""}
        ${item.result
          ? html` <p
              class="result ${classMap({
                [item.result]: true,
              })}"
            >
              <ha-svg-icon
                .path=${icons[item.result] ? icons[item.result] : mdiCircle}
                class="result-icon"
                slot="item-icon"
              ></ha-svg-icon>
              ${this.hass.localize(
                "ui.panel.config.zwave_js.node_config.set_param_" + item.result
              )}
              ${item.result === "error" && item.error
                ? html` <br /><em>${item.error}</em> `
                : ""}
            </p>`
          : ""}
      </span>
    `;

    // Numeric entries with a min value of 0 and max of 1 are considered boolean
    if (
      (item.configuration_value_type === "manual_entry" &&
        item.metadata.min === 0 &&
        item.metadata.max === 1) ||
      this._isEnumeratedBool(item)
    ) {
      return html`
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
      `;
    }

    if (item.configuration_value_type === "manual_entry") {
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
          ${item.metadata.unit
            ? html`<span slot="suffix">${item.metadata.unit}</span>`
            : ""}
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

  private _isEnumeratedBool(item): boolean {
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
    this.setResult(ev.target.key, undefined);
    this._updateConfigParameter(ev.target, ev.target.checked ? 1 : 0);
  }

  private _dropdownSelected(ev) {
    if (ev.target === undefined || this._config![ev.target.key] === undefined) {
      return;
    }
    if (this._config![ev.target.key].value === ev.target.selected) {
      return;
    }
    this.setResult(ev.target.key, undefined);

    this._updateConfigParameter(ev.target, Number(ev.target.selected));
  }

  private debouncedUpdate = debounce((target, value) => {
    this._config![target.key].value = value;

    this._updateConfigParameter(target, value);
  }, 1000);

  private _numericInputChanged(ev) {
    if (ev.target === undefined || this._config![ev.target.key] === undefined) {
      return;
    }
    const value = Number(ev.target.value);
    if (Number(this._config![ev.target.key].value) === value) {
      return;
    }
    this.setResult(ev.target.key, undefined);
    this.debouncedUpdate(ev.target, value);
  }

  private async _updateConfigParameter(target, value) {
    const nodeId = getNodeId(this._device!);
    try {
      const result = await setNodeConfigParameter(
        this.hass,
        this.configEntryId!,
        nodeId!,
        target.property,
        value,
        target.propertyKey ? target.propertyKey : undefined
      );
      this._config![target.key].value = value;

      this.setResult(target.key, result.status);
    } catch (error) {
      this._config![target.key].error = error.message;
      this.setResult(target.key, "error");
    }
  }

  private setResult(key: string, value: string | undefined) {
    const paramValue = this._config![key];
    paramValue.result = value;
    this._config = { ...this._config, [key]: paramValue };
  }

  private get _device(): DeviceRegistryEntry | undefined {
    return getDevice(this.deviceId, this._deviceRegistryEntries);
  }

  private async _fetchData() {
    if (!this.configEntryId || !this._deviceRegistryEntries) {
      return;
    }

    const device = this._device;
    if (!device) {
      this._error = "device_not_found";
      return;
    }

    const nodeId = getNodeId(device);
    if (!nodeId) {
      this._error = "device_not_found";
      return;
    }

    this._config = await fetchNodeConfigParameters(
      this.hass,
      this.configEntryId,
      nodeId!
    );
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        .accepted {
          color: green;
        }

        .queued {
          color: #fca503;
        }

        .error {
          color: red;
        }

        .secondary {
          color: var(--secondary-text-color);
        }

        .flex {
          display: flex;
        }

        .flex .config-label,
        .flex paper-dropdown-menu {
          flex: 1;
        }

        .content {
          margin-top: 24px;
        }

        .sectionHeader {
          position: relative;
          padding-right: 40px;
        }

        ha-card {
          margin: 0 auto;
          max-width: 600px;
        }

        ha-settings-row {
          --paper-time-input-justify-content: flex-end;
          border-top: 1px solid var(--divider-color);
        }

        :host(:not([narrow])) ha-settings-row paper-input {
          width: 30%;
          text-align: right;
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
