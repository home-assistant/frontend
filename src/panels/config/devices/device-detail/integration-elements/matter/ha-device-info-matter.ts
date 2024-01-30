import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../../../components/ha-expansion-panel";
import { getConfigEntries } from "../../../../../../data/config_entries";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import {
  getMatterNodeDiagnostics,
  MatterNodeDiagnostics,
  removeMatterFabric,
  MatterFabricData,
} from "../../../../../../data/matter";
import "@material/mwc-list";
import "../../../../../../components/ha-list-item";
import { SubscribeMixin } from "../../../../../../mixins/subscribe-mixin";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../../../dialogs/generic/show-dialog-box";

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

  private async _removeFabric(ev) {
    const fabric: MatterFabricData = ev.target.fabric;
    const fabricName =
      fabric.vendor_name || fabric.fabric_label || fabric.vendor_id.toString();
    const confirm = await showConfirmationDialog(this, {
      title: `Remove ${fabricName}?`,
    });

    if (!confirm) {
      return;
    }

    try {
      await removeMatterFabric(this.hass, this.device.id, fabric.fabric_index);
    } catch (err: any) {
      showAlertDialog(this, {
        title: "ERRORRR",
        text: "We should provide an error here",
      });
    }
  }

  protected async _fetchNodeDetails() {
    if (!this.device) {
      return;
    }

    const configEntries = await getConfigEntries(this.hass, {
      domain: "matter",
    });

    const configEntry = configEntries.find((entry) =>
      this.device.config_entries.includes(entry.entry_id)
    );

    if (!configEntry) {
      return;
    }
    this._nodeDiagnostics = await getMatterNodeDiagnostics(
      this.hass,
      this.device.id
    );
  }

  protected render() {
    if (!this._nodeDiagnostics) {
      return nothing;
    }
    return html`
      <ha-expansion-panel
        .header=${this.hass.localize(
          "ui.panel.config.matter.device_info.device_diagnostics"
        )}
      >
        <div>
          <div>
            ${this.hass.localize("ui.panel.config.matter.device_info.node_id")}:
            ${this._nodeDiagnostics.node_id}
          </div>
          <div>
            ${this.hass.localize(
              "ui.panel.config.matter.device_info.network_type"
            )}:
            ${this.hass.localize(
              `ui.panel.config.matter.network_type.${this._nodeDiagnostics.network_type}`
            )}
          </div>
          <div>
            ${this.hass.localize(
              "ui.panel.config.matter.device_info.node_type"
            )}:
            ${this.hass.localize(
              `ui.panel.config.matter.node_type.${this._nodeDiagnostics.node_type}`
            )}
          </div>
          ${this._nodeDiagnostics.network_name
            ? html`
                <div>
                  ${this.hass.localize(
                    "ui.panel.config.matter.device_info.network_name"
                  )}:
                  ${this._nodeDiagnostics.network_name}
                </div>
              `
            : nothing}
          ${this._nodeDiagnostics.mac_address
            ? html`
                <div>
                  ${this.hass.localize(
                    "ui.panel.config.matter.device_info.mac_address"
                  )}:
                  ${this._nodeDiagnostics.mac_address}
                </div>
              `
            : nothing}

          <div>
            ${this.hass.localize(
              "ui.panel.config.matter.device_info.ip_adresses"
            )}:
            ${this._nodeDiagnostics.ip_adresses.map((ip) => html`<br />${ip}`)}
          </div>
        </div>
      </ha-expansion-panel>
      <ha-expansion-panel
        class="fabrics"
        .header=${this.hass.localize(
          "ui.panel.config.matter.device_info.active_fabrics"
        )}
      >
        <mwc-list>
          ${this._nodeDiagnostics.active_fabrics.map(
            (fabric) =>
              html`<ha-list-item
                @click=${this._removeFabric}
                .fabric=${fabric}
                hasMeta
                >${fabric.vendor_name ||
                fabric.fabric_label ||
                fabric.vendor_id}
                <ha-icon slot="meta" icon="mdi:close"></ha-icon>
              </ha-list-item>`
          )}
        </mwc-list>
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
        ha-expansion-panel {
          margin: 0px -16px;
          --expansion-panel-summary-padding: 0 16px;
          --expansion-panel-content-padding: 0 16px;
          --ha-card-border-radius: 0px;
        }
        .fabrics {
          --expansion-panel-content-padding: 0;
          --expansion-panel-content-padding: 0;
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
