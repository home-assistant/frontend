import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list-item";
import {
  mdiCheckCircle,
  mdiCircle,
  mdiCloseCircle,
  mdiProgressClock,
} from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import memoizeOne from "memoize-one";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-select";
import "../../../../../components/ha-settings-row";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/ha-switch";
import "../../../../../components/ha-textfield";
import { groupBy } from "../../../../../common/util/group-by";
import {
  computeDeviceName,
  DeviceRegistryEntry,
  subscribeDeviceRegistry,
} from "../../../../../data/device_registry";
import {
  fetchZwaveNodeConfigParameters,
  fetchZwaveNodeMetadata,
  setZwaveNodeConfigParameter,
  ZWaveJSNodeConfigParam,
  ZWaveJSNodeConfigParams,
  ZwaveJSNodeMetadata,
  ZWaveJSSetConfigParamResult,
} from "../../../../../data/zwave_js";
import "../../../../../layouts/hass-error-screen";
import "../../../../../layouts/hass-loading-screen";
import "../../../../../layouts/hass-tabs-subpage";
import { SubscribeMixin } from "../../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import { configTabs } from "./zwave_js-config-router";

const icons = {
  accepted: mdiCheckCircle,
  queued: mdiProgressClock,
  error: mdiCloseCircle,
};

const getDevice = memoizeOne(
  (
    deviceId: string,
    entries?: DeviceRegistryEntry[]
  ): DeviceRegistryEntry | undefined =>
    entries?.find((device) => device.id === deviceId)
);

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

  @state() private _nodeMetadata?: ZwaveJSNodeMetadata;

  @state() private _config?: ZWaveJSNodeConfigParams;

  @state() private _results: Record<string, ZWaveJSSetConfigParamResult> = {};

  @state() private _error?: string;

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

    if (!this._config || !this._nodeMetadata) {
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
        <ha-config-section
          .narrow=${this.narrow}
          .isWide=${this.isWide}
          vertical
        >
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
                  html`<a
                    rel="noreferrer noopener"
                    href=${this._nodeMetadata?.device_database_url ||
                    "https://devices.zwave-js.io"}
                    target="_blank"
                    >${this.hass.localize(
                      "ui.panel.config.zwave_js.node_config.zwave_js_device_database"
                    )}</a
                  >`
                )}
              </em>
            </p>
          </div>
          ${Object.entries(
            groupBy(Object.entries(this._config), ([_, item]) =>
              item.endpoint.toString()
            )
          ).map(
            ([endpoint, configParamEntries]) =>
              html`<div class="content">
                <h3>
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.node_config.endpoint",
                    "endpoint",
                    endpoint
                  )}
                </h3>
                <ha-card>
                  ${configParamEntries
                    .sort(([_, paramA], [__, paramB]) =>
                      paramA.property !== paramB.property
                        ? paramA.property - paramB.property
                        : paramA.property_key! - paramB.property_key!
                    )
                    .map(
                      ([id, item]) =>
                        html` <ha-settings-row
                          class="config-item"
                          .configId=${id}
                          .narrow=${this.narrow}
                        >
                          ${this._generateConfigBox(id, item)}
                        </ha-settings-row>`
                    )}
                </ha-card>
              </div>`
          )}
        </ha-config-section>
      </hass-tabs-subpage>
    `;
  }

  private _generateConfigBox(
    id: string,
    item: ZWaveJSNodeConfigParam
  ): TemplateResult {
    const result = this._results[id];
    const labelAndDescription = html`
      <span slot="prefix" class="prefix">
        ${this.hass.localize("ui.panel.config.zwave_js.node_config.parameter")}
        <br />
        <span>${item.property}</span>
        ${item.property_key !== null
          ? html`<br />
              ${this.hass.localize(
                "ui.panel.config.zwave_js.node_config.bitmask"
              )}
              <br />
              <span>${item.property_key.toString(16)}</span>`
          : nothing}
      </span>
      <span slot="heading" class="heading" .title=${item.metadata.label}>
        ${item.metadata.label}
      </span>
      <span slot="description">
        ${item.metadata.description || item.metadata.label}
        ${item.metadata.description !== null && !item.metadata.writeable
          ? html`<br />`
          : nothing}
        ${!item.metadata.writeable
          ? html`<em>
              ${this.hass.localize(
                "ui.panel.config.zwave_js.node_config.parameter_is_read_only"
              )}
            </em>`
          : nothing}
        ${result?.status
          ? html`<p
              class="result ${classMap({
                [result.status]: true,
              })}"
            >
              <ha-svg-icon
                .path=${icons[result.status] ? icons[result.status] : mdiCircle}
                class="result-icon"
                slot="item-icon"
              ></ha-svg-icon>
              ${this.hass.localize(
                `ui.panel.config.zwave_js.node_config.set_param_${result.status}`
              )}
              ${result.status === "error" && result.error
                ? html` <br /><em>${result.error}</em> `
                : nothing}
            </p>`
          : nothing}
      </span>
    `;

    // Numeric entries with a min value of 0 and max of 1 are considered boolean
    if (
      item.configuration_value_type === "boolean" ||
      this._isEnumeratedBool(item)
    ) {
      return html`
        ${labelAndDescription}
        <div class="switch">
          <ha-switch
            .property=${item.property}
            .endpoint=${item.endpoint}
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
        <ha-textfield
          type="number"
          .value=${item.value}
          .min=${item.metadata.min}
          .max=${item.metadata.max}
          .property=${item.property}
          .endpoint=${item.endpoint}
          .propertyKey=${item.property_key}
          .key=${id}
          .disabled=${!item.metadata.writeable}
          @change=${this._numericInputChanged}
          .suffix=${item.metadata.unit}
        >
        </ha-textfield>`;
    }

    if (item.configuration_value_type === "enumerated") {
      return html`
        ${labelAndDescription}
        <ha-select
          .disabled=${!item.metadata.writeable}
          .value=${item.value?.toString()}
          .key=${id}
          .property=${item.property}
          .endpoint=${item.endpoint}
          .propertyKey=${item.property_key}
          @selected=${this._dropdownSelected}
        >
          ${Object.entries(item.metadata.states).map(
            ([key, entityState]) => html`
              <mwc-list-item .value=${key}>${entityState}</mwc-list-item>
            `
          )}
        </ha-select>
      `;
    }

    return html`${labelAndDescription}
      <p>${item.value}</p>`;
  }

  private _isEnumeratedBool(item: ZWaveJSNodeConfigParam): boolean {
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
    if (Object.keys(item.metadata.states).length !== 2) {
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
    if (this._config![ev.target.key].value?.toString() === ev.target.value) {
      return;
    }
    this.setResult(ev.target.key, undefined);

    this._updateConfigParameter(ev.target, Number(ev.target.value));
  }

  private _numericInputChanged(ev) {
    if (ev.target === undefined || this._config![ev.target.key] === undefined) {
      return;
    }
    const value = Number(ev.target.value);
    if (Number(this._config![ev.target.key].value) === value) {
      return;
    }
    this.setResult(ev.target.key, undefined);
    this._updateConfigParameter(ev.target, value);
  }

  private async _updateConfigParameter(target, value) {
    try {
      const result = await setZwaveNodeConfigParameter(
        this.hass,
        this._device!.id,
        target.property,
        target.endpoint,
        value,
        target.propertyKey ? target.propertyKey : undefined
      );
      this._config![target.key].value = value;

      this.setResult(target.key, result.status);
    } catch (err: any) {
      this.setError(target.key, err.message);
    }
  }

  private setResult(key: string, value: string | undefined) {
    if (value === undefined) {
      delete this._results[key];
      this.requestUpdate();
    } else {
      this._results = { ...this._results, [key]: { status: value } };
    }
  }

  private setError(key: string, message: string) {
    const errorParam = { status: "error", error: message };
    this._results = { ...this._results, [key]: errorParam };
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

    [this._nodeMetadata, this._config] = await Promise.all([
      fetchZwaveNodeMetadata(this.hass, device.id),
      fetchZwaveNodeConfigParameters(this.hass, device.id),
    ]);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .accepted {
          color: var(--success-color);
        }

        .queued {
          color: var(--warning-color);
        }

        .error {
          color: var(--error-color);
        }

        .secondary {
          color: var(--secondary-text-color);
        }

        .flex {
          display: flex;
        }

        .flex .config-label,
        .flex ha-select {
          flex: 1;
        }

        .content {
          margin-top: 24px;
        }

        .sectionHeader {
          position: relative;
          padding-right: 40px;
        }

        ha-settings-row {
          --settings-row-prefix-display: contents;
          --settings-row-content-width: 100%;
          --paper-time-input-justify-content: flex-end;
          border-top: 1px solid var(--divider-color);
          padding: 4px 16px;
        }

        ha-settings-row:first-child {
          border-top: none;
        }

        .prefix {
          color: var(--secondary-text-color);
          text-align: center;
          text-transform: uppercase;
          font-size: 0.8em;
          padding-right: 24px;
          line-height: 1.5em;
        }

        .prefix span {
          font-size: 1.3em;
        }

        .heading {
          white-space: normal;
        }

        :host(:not([narrow])) ha-settings-row ha-textfield {
          text-align: right;
        }

        ha-card:last-child {
          margin-bottom: 24px;
        }

        .switch {
          text-align: right;
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
