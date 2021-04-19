import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import {
  getIdentifiersFromDevice,
  ZWaveJSNodeIdentifiers,
} from "../../../../../../data/zwave_js";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";
import { showZWaveJSReinterviewNodeDialog } from "../../../../integrations/integration-panels/zwave_js/show-dialog-zwave_js-reinterview-node";

@customElement("ha-device-actions-zwave_js")
export class HaDeviceActionsZWaveJS extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  @internalProperty() private _entryId?: string;

  @internalProperty() private _nodeId?: number;

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("device")) {
      this._entryId = this.device.config_entries[0];

      const identifiers:
        | ZWaveJSNodeIdentifiers
        | undefined = getIdentifiersFromDevice(this.device);
      if (!identifiers) {
        return;
      }
      this._nodeId = identifiers.node_id;
    }
  }

  protected render(): TemplateResult {
    return html`
      <a
        .href=${`/config/zwave_js/node_config/${this.device.id}?config_entry=${this._entryId}`}
      >
        <mwc-button>
          ${this.hass.localize(
            "ui.panel.config.zwave_js.device_info.device_config"
          )}
        </mwc-button>
      </a>
      <mwc-button @click=${this._reinterviewClicked}
        >Re-interview Device</mwc-button
      >
    `;
  }

  private async _reinterviewClicked() {
    if (!this._nodeId || !this._entryId) {
      return;
    }
    showZWaveJSReinterviewNodeDialog(this, {
      entry_id: this._entryId,
      node_id: this._nodeId,
    });
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        a {
          text-decoration: none;
        }
      `,
    ];
  }
}
