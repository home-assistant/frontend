import "@material/mwc-button/mwc-button";

import {
  mdiCheckCircle,
  mdiCircle,
  mdiCloseCircle,
  mdiProgressClock,
} from "@mdi/js";
import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { fireEvent } from "../../../../../common/dom/fire_event";
import { computeDeviceNameDisplay } from "../../../../../common/entity/compute_device_name";
import { groupBy } from "../../../../../common/util/group-by";
import "../../../../../components/buttons/ha-progress-button";
import type { HaProgressButton } from "../../../../../components/buttons/ha-progress-button";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-card";
import "../../../../../components/ha-list-item";
import "../../../../../components/ha-select";
import "../../../../../components/ha-selector/ha-selector-boolean";
import "../../../../../components/ha-settings-row";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/ha-textfield";
import "../../../../../components/ha-combo-box";
import type {
  ZWaveJSNodeCapabilities,
  ZWaveJSNodeConfigParam,
  ZWaveJSNodeConfigParams,
  ZWaveJSSetConfigParamResult,
  ZwaveJSNodeMetadata,
} from "../../../../../data/zwave_js";
import {
  fetchZwaveNodeCapabilities,
  fetchZwaveNodeConfigParameters,
  fetchZwaveNodeMetadata,
  invokeZWaveCCApi,
  setZwaveNodeConfigParameter,
} from "../../../../../data/zwave_js";
import { showConfirmationDialog } from "../../../../../dialogs/generic/show-dialog-box";
import "../../../../../layouts/hass-error-screen";
import "../../../../../layouts/hass-loading-screen";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import { configTabs } from "./zwave_js-config-router";
import "./zwave_js-custom-param";

const icons = {
  accepted: mdiCheckCircle,
  queued: mdiProgressClock,
  error: mdiCloseCircle,
};

@customElement("zwave_js-node-config")
class ZWaveJSNodeConfig extends LitElement {
  public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public configEntryId?: string;

  @property({ attribute: false }) public deviceId!: string;

  @state() private _nodeMetadata?: ZwaveJSNodeMetadata;

  @state() private _config?: ZWaveJSNodeConfigParams;

  @state() private _canResetAll = false;

  @state() private _results: Record<string, ZWaveJSSetConfigParamResult> = {};

  @state() private _error?: string;

  @state() private _resetDialogProgress = false;

  public connectedCallback(): void {
    super.connectedCallback();
    this.deviceId = this.route.path.substr(1);
  }

  protected updated(changedProps: PropertyValues): void {
    if (!this._config || changedProps.has("deviceId")) {
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

    const device = this.hass.devices[this.deviceId];

    const deviceName = device
      ? computeDeviceNameDisplay(device, this.hass)
      : "";

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
                    <h2>${deviceName}</h2>
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
                  {
                    device_database: html`<a
                      rel="noreferrer noopener"
                      href=${this._nodeMetadata?.device_database_url ||
                      "https://devices.zwave-js.io"}
                      target="_blank"
                      >${this.hass.localize(
                        "ui.panel.config.zwave_js.node_config.zwave_js_device_database"
                      )}</a
                    >`,
                  }
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
                    { endpoint }
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
          ${this._canResetAll
            ? html`<div class="reset">
                <ha-progress-button
                  .disabled=${this._resetDialogProgress}
                  .progress=${this._resetDialogProgress}
                  @click=${this._openResetDialog}
                >
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.node_config.reset_to_default.button_label"
                  )}
                </ha-progress-button>
              </div>`
            : nothing}
          <h3>
            ${this.hass.localize(
              "ui.panel.config.zwave_js.node_config.custom_config"
            )}
          </h3>
          <span class="secondary">
            ${this.hass.localize(
              "ui.panel.config.zwave_js.node_config.custom_config_description"
            )}
          </span>
          <ha-card class="custom-config">
            <zwave_js-custom-param
              .hass=${this.hass}
              .deviceId=${this.deviceId}
              @new-value=${this._handleNewValue}
            ></zwave_js-custom-param>
          </ha-card>
        </ha-config-section>
      </hass-tabs-subpage>
    `;
  }

  private _generateConfigBox(
    id: string,
    item: ZWaveJSNodeConfigParam
  ): TemplateResult {
    const result = this._results[id];

    const isTypeBoolean = item.configuration_value_type === "boolean" || this._isEnumeratedBool(item);

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
        ${item.metadata.description}
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

    const defaultLabel =
      item.metadata.writeable && item.metadata.default !== undefined
        ? `${this.hass.localize("ui.panel.config.zwave_js.node_config.default")}:
          ${
            isTypeBoolean
              ? this.hass.localize(
                  item.metadata.default === 1 ? "ui.common.yes" : "ui.common.no"
                )
              : item.configuration_value_type === "enumerated"
                ? item.metadata.states[item.metadata.default] ||
                  item.metadata.default
                : item.metadata.default
          }`
        : "";

    // Numeric entries with a min value of 0 and max of 1 are considered boolean
    if (isTypeBoolean) {
      return html`
        ${labelAndDescription}
        <div class="switch">
          <ha-selector-boolean
            .property=${item.property}
            .endpoint=${item.endpoint}
            .propertyKey=${item.property_key}
            .value=${item.value === 1}
            .key=${id}
            @value-changed=${this._switchToggled}
            .disabled=${!item.metadata.writeable}
            .helper=${defaultLabel}
          ></ha-selector-boolean>
        </div>
      `;
    }
    if (item.configuration_value_type === "manual_entry") {
      if (
        item.metadata.states &&
        item.metadata.min != null &&
        item.metadata.max != null &&
        item.metadata.max - item.metadata.min <= 100
      ) {
        return html`
          ${labelAndDescription}
          <ha-combo-box
            .hass=${this.hass}
            .value=${item.value?.toString()}
            allow-custom-value
            hide-clear-icon
            .items=${Object.entries(item.metadata.states).map(
              ([value, label]) => ({ value, label })
            )}
            .disabled=${!item.metadata.writeable}
            .placeholder=${item.metadata.unit}
            .helper=${`${this.hass.localize("ui.panel.config.zwave_js.node_config.between_min_max", { min: item.metadata.min, max: item.metadata.max })}${defaultLabel ? `, ${defaultLabel}` : ""}`}
            @value-changed=${this._getComboBoxValueChangedCallback(id, item)}
          >
          </ha-combo-box>
        `;
      }
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
          .helper=${`${this.hass.localize("ui.panel.config.zwave_js.node_config.between_min_max", { min: item.metadata.min, max: item.metadata.max })}${defaultLabel ? `, ${defaultLabel}` : ""}`}
          helperPersistent
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
          .helper=${defaultLabel}
        >
          ${Object.entries(item.metadata.states).map(
            ([key, entityState]) => html`
              <ha-list-item .value=${key}>${entityState}</ha-list-item>
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

  private _handleNewValue() {
    setTimeout(() => {
      this._fetchData();
    }, 750);
  }

  private _switchToggled(ev) {
    this._setResult(ev.target.key, undefined);
    this._updateConfigParameter(ev.target, ev.detail.value ? 1 : 0);
  }

  private _dropdownSelected(ev) {
    if (ev.target === undefined || this._config![ev.target.key] === undefined) {
      return;
    }
    if (this._config![ev.target.key].value?.toString() === ev.target.value) {
      return;
    }
    this._setResult(ev.target.key, undefined);

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
    if (isNaN(value)) {
      this._setError(
        ev.target.key,
        this.hass.localize(
          "ui.panel.config.zwave_js.node_config.error_not_numeric"
        )
      );
      return;
    }
    if (
      (ev.target.min !== undefined && value < ev.target.min) ||
      (ev.target.max !== undefined && value > ev.target.max)
    ) {
      this._setError(
        ev.target.key,
        this.hass.localize(
          "ui.panel.config.zwave_js.node_config.error_not_in_range",
          { min: ev.target.min, max: ev.target.max }
        )
      );
      return;
    }
    this._setResult(ev.target.key, undefined);
    this._updateConfigParameter(ev.target, value);
  }

  private _getComboBoxValueChangedCallback(
    id: string,
    item: ZWaveJSNodeConfigParam
  ) {
    return (ev: CustomEvent<{ value: number }>) =>
      this._numericInputChanged({
        ...ev,
        target: {
          ...ev.target,
          key: id,
          min: item.metadata.min,
          max: item.metadata.max,
          value: ev.detail.value,
          property: item.property,
          endpoint: item.endpoint,
          propertyKey: item.property_key,
        },
      });
  }

  private async _updateConfigParameter(target, value) {
    try {
      const result = await setZwaveNodeConfigParameter(
        this.hass,
        this.deviceId,
        target.property,
        target.endpoint,
        value,
        target.propertyKey ? target.propertyKey : undefined
      );
      this._config![target.key].value = value;

      this._setResult(target.key, result.status);
    } catch (err: any) {
      this._setError(target.key, err.message);
    }
  }

  private _setResult(key: string, value: string | undefined) {
    if (value === undefined) {
      delete this._results[key];
      this.requestUpdate();
    } else {
      this._results = { ...this._results, [key]: { status: value } };
    }
  }

  private _setError(key: string, message: string) {
    const errorParam = { status: "error", error: message };
    this._results = { ...this._results, [key]: errorParam };
  }

  private async _fetchData() {
    if (!this.configEntryId) {
      return;
    }

    const device = this.hass.devices[this.deviceId];
    if (!device) {
      this._error = "device_not_found";
      return;
    }

    let capabilities: ZWaveJSNodeCapabilities | undefined;
    [this._nodeMetadata, this._config, capabilities] = await Promise.all([
      fetchZwaveNodeMetadata(this.hass, device.id),
      fetchZwaveNodeConfigParameters(this.hass, device.id),
      fetchZwaveNodeCapabilities(this.hass, device.id),
    ]);
    this._canResetAll =
      capabilities &&
      Object.values(capabilities).some((endpoint) =>
        endpoint.some(
          (capability) => capability.id === 0x70 && capability.version >= 4
        )
      );
  }

  private async _openResetDialog(event: Event) {
    const progressButton = event.currentTarget as HaProgressButton;

    await showConfirmationDialog(this, {
      destructive: true,
      title: this.hass.localize(
        "ui.panel.config.zwave_js.node_config.reset_to_default.dialog.title"
      ),
      text: this.hass.localize(
        "ui.panel.config.zwave_js.node_config.reset_to_default.dialog.text"
      ),
      confirmText: this.hass.localize(
        "ui.panel.config.zwave_js.node_config.reset_to_default.dialog.reset"
      ),
      confirm: () => this._resetAllConfigParameters(progressButton),
    });
  }

  private async _resetAllConfigParameters(progressButton: HaProgressButton) {
    this._resetDialogProgress = true;
    fireEvent(this, "hass-notification", {
      message: this.hass.localize(
        "ui.panel.config.zwave_js.node_config.reset_to_default.dialog.text_loading"
      ),
    });

    try {
      const device = this.hass.devices[this.deviceId];
      if (!device) {
        throw new Error("device_not_found");
      }
      await invokeZWaveCCApi(
        this.hass,
        device.id,
        0x70, // 0x70 is the command class for Configuration
        undefined,
        "resetAll",
        [],
        true
      );

      fireEvent(this, "hass-notification", {
        message: this.hass.localize(
          "ui.panel.config.zwave_js.node_config.reset_to_default.dialog.text_success"
        ),
      });

      await this._fetchData();
      progressButton.actionSuccess();
    } catch (_err: any) {
      fireEvent(this, "hass-notification", {
        message: this.hass.localize(
          "ui.panel.config.zwave_js.node_config.reset_to_default.dialog.text_error"
        ),
      });
      progressButton.actionError();
    }
    this._resetDialogProgress = false;
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
          padding-inline-start: initial;
          padding-inline-end: 40px;
        }

        ha-settings-row {
          --settings-row-prefix-display: contents;
          --settings-row-content-width: 100%;
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
          padding-inline-end: 24px;
          padding-inline-start: initial;
          line-height: var(--ha-line-height-normal);
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

        .custom-config {
          padding: 16px;
        }

        .reset {
          display: flex;
          justify-content: flex-end;
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
