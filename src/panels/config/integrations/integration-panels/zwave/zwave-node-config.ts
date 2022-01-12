import "@polymer/paper-dropdown-menu/paper-dropdown-menu";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../components/buttons/ha-call-service-button";
import "../../../../../components/ha-card";
import {
  fetchNodeConfig,
  ZWaveConfigItem,
  ZWaveConfigServiceData,
  ZWaveNode,
} from "../../../../../data/zwave";
import { haStyle } from "../../../../../resources/styles";
import { HomeAssistant } from "../../../../../types";

@customElement("zwave-node-config")
export class ZwaveNodeConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public nodes: ZWaveNode[] = [];

  @property() public config: ZWaveConfigItem[] = [];

  @property() public selectedNode = -1;

  @state() private _configItem?: ZWaveConfigItem;

  @state() private _wakeupInput = -1;

  @state() private _selectedConfigParameter = -1;

  @state() private _selectedConfigValue: number | string = -1;

  protected render(): TemplateResult {
    return html`
      <div class="content">
        <ha-card
          .header=${this.hass!.localize(
            "ui.panel.config.zwave.node_config.header"
          )}
        >
          ${"wake_up_interval" in this.nodes[this.selectedNode].attributes
            ? html`
                <div class="card-actions">
                  <paper-input
                    .floatLabel=${this.hass!.localize(
                      "ui.panel.config.zwave.common.wakeup_interval"
                    )}
                    type="number"
                    .value=${this._wakeupInput !== -1
                      ? this._wakeupInput
                      : this.hass!.localize(
                          "ui.panel.config.zwave.common.unknown"
                        )}
                    @value-changed=${this._onWakeupIntervalChanged}
                    .placeholder=${this.nodes[this.selectedNode].attributes
                      .wake_up_interval
                      ? this.nodes[this.selectedNode].attributes
                          .wake_up_interval
                      : this.hass!.localize(
                          "ui.panel.config.zwave.common.unknown"
                        )}
                  >
                    <div suffix>
                      ${this.hass!.localize(
                        "ui.panel.config.zwave.node_config.seconds"
                      )}
                    </div>
                  </paper-input>
                  <ha-call-service-button
                    .hass=${this.hass}
                    domain="zwave"
                    service="set_wakeup"
                    .serviceData=${this._computeWakeupServiceData(
                      this._wakeupInput
                    )}
                  >
                    ${this.hass!.localize(
                      "ui.panel.config.zwave.node_config.set_wakeup"
                    )}
                  </ha-call-service-button>
                </div>
              `
            : ""}
          <div class="device-picker">
            <paper-dropdown-menu
              .label=${this.hass!.localize(
                "ui.panel.config.zwave.node_config.config_parameter"
              )}
              dynamic-align
              class="flex"
            >
              <paper-listbox
                slot="dropdown-content"
                .selected=${this._selectedConfigParameter}
                @iron-select=${this._selectedConfigParameterChanged}
              >
                ${this.config.map(
                  (entityState) => html`
                    <paper-item>
                      ${entityState.key}: ${entityState.value.label}
                    </paper-item>
                  `
                )}
              </paper-listbox>
            </paper-dropdown-menu>
          </div>
          ${this._configItem
            ? html`
                ${this._configItem.value.type === "List"
                  ? html`
                      <div class="device-picker">
                        <paper-dropdown-menu
                          .label=${this.hass!.localize(
                            "ui.panel.config.zwave.node_config.config_value"
                          )}
                          dynamic-align
                          class="flex"
                          .placeholder=${this._configItem.value.data}
                        >
                          <paper-listbox
                            slot="dropdown-content"
                            .selected=${this._configItem.value.data}
                            @iron-select=${this._configValueSelectChanged}
                          >
                            ${this._configItem.value.data_items.map(
                              (entityState) => html`
                                <paper-item>${entityState}</paper-item>
                              `
                            )}
                          </paper-listbox>
                        </paper-dropdown-menu>
                      </div>
                    `
                  : ""}
                ${["Byte", "Short", "Int"].includes(this._configItem.value.type)
                  ? html`
                      <div class="card-actions">
                        <paper-input
                          .label=${this._configItem.value.data_items}
                          type="number"
                          .value=${this._configItem.value.data}
                          .max=${this._configItem.value.max}
                          .min=${this._configItem.value.min}
                          @value-changed=${this._configValueInputChanged}
                        >
                        </paper-input>
                      </div>
                    `
                  : ""}
                ${["Bool", "Button"].includes(this._configItem.value.type)
                  ? html`
                      <div class="device-picker">
                        <paper-dropdown-menu
                          .label=${this.hass!.localize(
                            "ui.panel.config.zwave.node_config.config_value"
                          )}
                          class="flex"
                          dynamic-align
                          .placeholder=${this._configItem.value.data}
                        >
                          <paper-listbox
                            slot="dropdown-content"
                            .selected=${this._configItem.value.data}
                            @iron-select=${this._configValueSelectChanged}
                          >
                            <paper-item>
                              ${this.hass!.localize(
                                "ui.panel.config.zwave.node_config.true"
                              )}
                            </paper-item>
                            <paper-item>
                              ${this.hass!.localize(
                                "ui.panel.config.zwave.node_config.false"
                              )}
                            </paper-item>
                          </paper-listbox>
                        </paper-dropdown-menu>
                      </div>
                    `
                  : ""}
                <div class="help-text">
                  <span>${this._configItem.value.help}</span>
                </div>
                ${["Bool", "Button", "Byte", "Short", "Int", "List"].includes(
                  this._configItem.value.type
                )
                  ? html`
                      <div class="card-actions">
                        <ha-call-service-button
                          .hass=${this.hass}
                          domain="zwave"
                          service="set_config_parameter"
                          .serviceData=${this._computeSetConfigParameterServiceData()}
                        >
                          ${this.hass!.localize(
                            "ui.panel.config.zwave.node_config.set_config_parameter"
                          )}
                        </ha-call-service-button>
                      </div>
                    `
                  : ""}
              `
            : ""}
        </ha-card>
      </div>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          margin-top: 24px;
        }

        ha-card {
          margin: 0 auto;
          max-width: 600px;
        }

        .device-picker {
          @apply --layout-horizontal;
          @apply --layout-center-center;
          display: -ms-flexbox;
          display: -webkit-flex;
          display: flex;
          -ms-flex-direction: row;
          -webkit-flex-direction: row;
          flex-direction: row;
          -ms-flex-align: center;
          -webkit-align-items: center;
          align-items: center;
          padding-left: 24px;
          padding-right: 24px;
          padding-bottom: 24px;
        }

        .help-text {
          padding-left: 24px;
          padding-right: 24px;
        }

        .flex {
          -ms-flex: 1 1 0.000000001px;
          -webkit-flex: 1;
          flex: 1;
          -webkit-flex-basis: 0.000000001px;
          flex-basis: 0.000000001px;
        }
      `,
    ];
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this.addEventListener("hass-service-called", (ev) =>
      this.serviceCalled(ev)
    );
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (changedProps.has("selectedNode")) {
      this._nodesChanged();
    }
  }

  private serviceCalled(ev): void {
    if (ev.detail.success) {
      setTimeout(() => {
        this._refreshConfig(this.selectedNode);
      }, 5000);
    }
  }

  private _nodesChanged(): void {
    if (!this.nodes) {
      return;
    }
    this._configItem = undefined;
    this._wakeupInput =
      this.nodes[this.selectedNode].attributes.wake_up_interval || -1;
  }

  private _onWakeupIntervalChanged(value: ChangeEvent): void {
    this._wakeupInput = value.detail!.value;
  }

  private _computeWakeupServiceData(wakeupInput: number) {
    return {
      node_id: this.nodes[this.selectedNode].attributes.node_id,
      value: wakeupInput,
    };
  }

  private _computeSetConfigParameterServiceData():
    | ZWaveConfigServiceData
    | boolean {
    if (this.selectedNode === -1 || typeof this._configItem === "undefined") {
      return false;
    }
    let valueData: number | string = "";
    if (["Short", "Byte", "Int"].includes(this._configItem!.value.type)) {
      valueData =
        typeof this._selectedConfigValue === "string"
          ? parseInt(this._selectedConfigValue, 10)
          : this._selectedConfigValue;
    }
    if (["Bool", "Button", "List"].includes(this._configItem!.value.type)) {
      valueData = this._selectedConfigValue;
    }
    return {
      node_id: this.nodes[this.selectedNode].attributes.node_id,
      parameter: this._configItem.key,
      value: valueData,
    };
  }

  private _selectedConfigParameterChanged(event: ItemSelectedEvent): void {
    if (event.target!.selected === -1) {
      return;
    }
    this._selectedConfigParameter = event.target!.selected;
    this._configItem = this.config[event.target!.selected];
  }

  private _configValueSelectChanged(event: ItemSelectedEvent): void {
    if (event.target!.selected === -1) {
      return;
    }
    this._selectedConfigValue = event.target!.selectedItem.textContent;
  }

  private _configValueInputChanged(value: ChangeEvent): void {
    this._selectedConfigValue = value.detail!.value;
  }

  private async _refreshConfig(selectedNode): Promise<void> {
    const configData: ZWaveConfigItem[] = [];
    const config = await fetchNodeConfig(
      this.hass,
      this.nodes[selectedNode].attributes.node_id
    );

    Object.keys(config).forEach((key) => {
      configData.push({
        key: parseInt(key, 10),
        value: config[key],
      });
    });

    this.config = configData;
    this._configItem = this.config[this._selectedConfigParameter];
  }
}

export interface ChangeEvent {
  detail?: {
    value?: any;
  };
  target?: EventTarget;
}

export interface PickerTarget extends EventTarget {
  selected: number;
  selectedItem?: any;
}

export interface ItemSelectedEvent {
  target?: PickerTarget;
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave-node-config": ZwaveNodeConfig;
  }
}
