import "@material/mwc-button/mwc-button";
import "@material/mwc-list/mwc-list-item";
import {
  CSSResultGroup,
  LitElement,
  PropertyValues,
  TemplateResult,
  css,
  html,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { dynamicElement } from "../../../../../common/dom/dynamic-element-directive";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-select";
import "../../../../../components/ha-settings-row";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/ha-switch";
import "../../../../../components/ha-textfield";
import { computeDeviceName } from "../../../../../data/device_registry";
import {
  ZWaveJSNodeCapabilities,
  ZwaveJSNodeMetadata,
  fetchZwaveNodeCapabilities,
  fetchZwaveNodeMetadata,
} from "../../../../../data/zwave_js";
import "../../../../../layouts/hass-error-screen";
import "../../../../../layouts/hass-loading-screen";
import "../../../../../layouts/hass-tabs-subpage";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant, Route } from "../../../../../types";
import "../../../ha-config-section";
import { configTabs } from "./zwave_js-config-router";
import "./capability-controls/zwave_js-capability-control-multilevel-switch";

const CAPABILITY_CONTROLS = {
  38: "multilevel_switch",
};

@customElement("zwave_js-node-installer")
class ZWaveJSNodeInstaller extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public route!: Route;

  @property({ type: Boolean }) public narrow = false;

  @property({ type: Boolean }) public isWide = false;

  @property() public configEntryId?: string;

  @property() public deviceId!: string;

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
            ${this.hass.localize(
              "ui.panel.config.zwave_js.node_installer.header"
            )}
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
              "ui.panel.config.zwave_js.node_installer.introduction"
            )}
          </div>
          ${Object.entries(this._capabilities).map(([endpoint, capabilities]) =>
            capabilities.map(
              (capability) =>
                html`Endpoint: ${endpoint}<br />Command Class:
                  ${capability.name}<br />
                  ${capability.id in CAPABILITY_CONTROLS
                    ? dynamicElement(
                        `zwave_js-capability-control-${CAPABILITY_CONTROLS[capability.id]}`,
                        {
                          hass: this.hass,
                          device: device,
                          endpoint: endpoint,
                          command_class: capability.id,
                          version: capability.version,
                          is_secure: capability.is_secure,
                        }
                      )
                    : nothing}
                  <hr />
                  <br />`
            )
          )}
        </ha-config-section>
      </hass-tabs-subpage>
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
    return [haStyle, css``];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "zwave_js-node-installer": ZWaveJSNodeInstaller;
  }
}
