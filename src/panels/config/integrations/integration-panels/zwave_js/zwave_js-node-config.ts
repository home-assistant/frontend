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
  fetchDeviceFromNode,
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
            <ha-switch .id=${id} .checked=${item.value === 1}></ha-switch>
          </div>
        </div>
      `;
    }

    return html` ${labelAndDescription}
    ${item.metadata.states
      ? html`
          <p>
            ${item.metadata.states[item.value]}<br />
            <span class="secondary tech-info">
              Value ${item.value}
            </span>
          </p>
        `
      : html`<p>${item.value}</p>`}`;
  }

  private _isEnumeratedBool(item) {
    // Some Z-Wave config values use a states list with two options where index 0 = Disabled and 1 = Enabled
    // We want those to be considered boolean and show a toggle switch
    if (item.configuration_value_type !== "enumerated") {
      return false;
    }
    if (!("states" in item.metadata)) {
      return false;
    }
    if (
      (item.metadata.states[0] === "Disable" ||
        item.metadata.states[0] === "Disabled") &&
      (item.metadata.states[1] === "Enable" ||
        item.metadata.states[1] === "Enabled")
    ) {
      return true;
    }
    return false;
  }

  private async _fetchData() {
    if (!this.configEntryId || !this.nodeId) {
      return;
    }
    this._device = await fetchDeviceFromNode(
      this.hass,
      this.configEntryId,
      this.nodeId
    );
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

        .flex .config-label {
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
