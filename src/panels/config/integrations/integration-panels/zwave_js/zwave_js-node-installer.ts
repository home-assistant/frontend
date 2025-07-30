import type { CSSResultGroup, PropertyValues, TemplateResult } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { dynamicElement } from "../../../../../common/dom/dynamic-element-directive";
import { computeDeviceNameDisplay } from "../../../../../common/entity/compute_device_name";
import "../../../../../components/ha-card";
import type {
  ZWaveJSNodeCapabilities,
  ZwaveJSNodeMetadata,
} from "../../../../../data/zwave_js";
import {
  fetchZwaveNodeCapabilities,
  fetchZwaveNodeMetadata,
} from "../../../../../data/zwave_js";
import "../../../../../layouts/hass-error-screen";
import "../../../../../layouts/hass-loading-screen";
import "../../../../../layouts/hass-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import "./capability-controls/zwave_js-capability-control-color-switch";
import "./capability-controls/zwave_js-capability-control-door-lock";
import "./capability-controls/zwave_js-capability-control-multilevel-switch";
import "./capability-controls/zwave_js-capability-control-thermostat-setback";

const CAPABILITY_CONTROLS = {
  38: "multilevel_switch",
  71: "thermostat_setback",
  98: "door_lock",
  51: "color_switch",
};

@customElement("zwave_js-node-installer")
class ZWaveJSNodeInstaller extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ attribute: "is-wide", type: Boolean }) public isWide = false;

  @property({ attribute: false }) public configEntryId?: string;

  @property({ attribute: false }) public deviceId!: string;

  @state() private _nodeMetadata?: ZwaveJSNodeMetadata;

  @state() private _capabilities?: ZWaveJSNodeCapabilities;

  @state() private _error?: string;

  public connectedCallback(): void {
    super.connectedCallback();
    this.deviceId = this.route.path.substr(1);
  }

  protected updated(changedProps: PropertyValues): void {
    if (!this._capabilities || changedProps.has("deviceId")) {
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

    if (!this._capabilities || !this._nodeMetadata) {
      return html`<hass-loading-screen></hass-loading-screen>`;
    }

    const device = this.hass.devices[this.deviceId];

    const endpoints = Object.entries(this._capabilities).filter(
      ([_endpoint, capabilities]) => {
        const filteredCapabilities = capabilities.filter(
          (capability) => capability.id in CAPABILITY_CONTROLS
        );
        return filteredCapabilities.length > 0;
      }
    );

    return html`
      <hass-subpage
        .hass=${this.hass}
        .narrow=${this.narrow}
        .route=${this.route}
      >
        <ha-config-section
          .narrow=${this.narrow}
          .isWide=${this.isWide}
          vertical
        >
          <div slot="header">
            ${this.hass.localize(
              "ui.panel.config.zwave_js.node_installer.header"
            )}
          </div>

          <div slot="introduction">
            ${device
              ? html`
                  <div class="device-info">
                    <h2>${computeDeviceNameDisplay(device, this.hass)}</h2>
                    <p>${device.manufacturer} ${device.model}</p>
                  </div>
                `
              : ``}
            ${this.hass.localize(
              "ui.panel.config.zwave_js.node_installer.introduction"
            )}
          </div>
          ${endpoints.length
            ? endpoints.map(
                ([endpoint, capabilities]) => html`
                  <h3>
                    ${this.hass.localize(
                      "ui.panel.config.zwave_js.node_installer.endpoint"
                    )}:
                    ${endpoint}
                  </h3>
                  <ha-card>
                    ${capabilities.map(
                      (capability) => html`
                        ${capability.id in CAPABILITY_CONTROLS
                          ? html` <div class="capability">
                              <h4>
                                ${this.hass.localize(
                                  "ui.panel.config.zwave_js.node_installer.command_class"
                                )}:
                                ${capability.name}
                              </h4>
                              ${dynamicElement(
                                `zwave_js-capability-control-${CAPABILITY_CONTROLS[capability.id]}`,
                                {
                                  hass: this.hass,
                                  device: device,
                                  endpoint: endpoint,
                                  command_class: capability.id,
                                  version: capability.version,
                                  is_secure: capability.is_secure,
                                }
                              )}
                            </div>`
                          : nothing}
                      `
                    )}
                  </ha-card>
                `
              )
            : html`<ha-card class="empty"
                >${this.hass.localize(
                  "ui.panel.config.zwave_js.node_installer.no_settings"
                )}</ha-card
              >`}
        </ha-config-section>
      </hass-subpage>
    `;
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

    [this._nodeMetadata, this._capabilities] = await Promise.all([
      fetchZwaveNodeMetadata(this.hass, device.id),
      fetchZwaveNodeCapabilities(this.hass, device.id),
    ]);
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        ha-card {
          margin-bottom: 40px;
          margin-top: 0;
        }
        .capability {
          border-bottom: 1px solid var(--divider-color);
          padding: 4px 16px;
        }
        .capability:last-child {
          border-bottom: none;
        }
        .empty {
          margin-top: 32px;
          padding: 24px 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-node-installer": ZWaveJSNodeInstaller;
  }
}
