import type { CSSResultGroup, PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../../components/ha-expansion-panel";
import type { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import type { MatterNodeDiagnostics } from "../../../../../../data/matter";
import { getMatterNodeDiagnostics } from "../../../../../../data/matter";
import { SubscribeMixin } from "../../../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../../types";

@customElement("ha-device-info-matter")
export class HaDeviceInfoMatter extends SubscribeMixin(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @state() private _nodeDiagnostics?: MatterNodeDiagnostics;

  public willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties);
    if (changedProperties.has("device")) {
      this._fetchNodeDetails();
    }
  }

  private async _fetchNodeDetails() {
    if (!this.device) {
      return;
    }

    if (this.device.via_device_id !== null) {
      // only show device details for top level nodes (so not bridged)
      return;
    }

    try {
      this._nodeDiagnostics = await getMatterNodeDiagnostics(
        this.hass,
        this.device.id
      );
    } catch (_err: any) {
      this._nodeDiagnostics = undefined;
    }
  }

  protected render() {
    if (!this._nodeDiagnostics) {
      return nothing;
    }
    return html`
      <ha-expansion-panel
        .header=${this.hass.localize(
          "ui.panel.config.matter.device_info.device_info"
        )}
      >
        <div class="row">
          <span class="name"
            >${this.hass.localize(
              "ui.panel.config.matter.device_info.node_id"
            )}:</span
          >
          <span class="value">${this._nodeDiagnostics.node_id}</span>
        </div>
        <div class="row">
          <span class="name"
            >${this.hass.localize(
              "ui.panel.config.matter.device_info.network_type"
            )}:</span
          >
          <span class="value"
            >${this.hass.localize(
              `ui.panel.config.matter.network_type.${this._nodeDiagnostics.network_type}`
            )}</span
          >
        </div>
        <div class="row">
          <span class="name"
            >${this.hass.localize(
              "ui.panel.config.matter.device_info.node_type"
            )}:</span
          >
          <span class="value"
            >${this.hass.localize(
              `ui.panel.config.matter.node_type.${this._nodeDiagnostics.node_type}`
            )}</span
          >
        </div>
        ${this._nodeDiagnostics.network_name
          ? html`
              <div class="row">
                <span class="name"
                  >${this.hass.localize(
                    "ui.panel.config.matter.device_info.network_name"
                  )}:</span
                >
                <span class="value">${this._nodeDiagnostics.network_name}</span>
              </div>
            `
          : nothing}
        ${this._nodeDiagnostics.mac_address
          ? html`
              <div class="row">
                <span class="name"
                  >${this.hass.localize(
                    "ui.panel.config.matter.device_info.mac_address"
                  )}:</span
                >
                <span class="value">${this._nodeDiagnostics.mac_address}</span>
              </div>
            `
          : nothing}

        <div class="row">
          <span class="name"
            >${this.hass.localize(
              "ui.panel.config.matter.device_info.ip_adresses"
            )}:</span
          >
          <span class="value"
            >${this._nodeDiagnostics.ip_adresses.map(
              (ip) => html`${ip}<br />`
            )}</span
          >
        </div>
      </ha-expansion-panel>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        h4 {
          margin-bottom: 4px;
        }
        div {
          word-break: break-all;
          margin-top: 2px;
        }
        .row {
          display: flex;
          justify-content: space-between;
          padding-bottom: 4px;
        }
        .value {
          text-align: right;
        }
        ha-expansion-panel {
          margin: 8px -16px 0;
          --expansion-panel-summary-padding: 0 16px;
          --expansion-panel-content-padding: 0 16px;
          --ha-card-border-radius: 0px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-info-matter": HaDeviceInfoMatter;
  }
}
