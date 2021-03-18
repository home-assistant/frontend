import "@material/mwc-button/mwc-button";
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";

import { HomeAssistant } from "../../../../../../types";

@customElement("ha-device-actions-zwave_js")
export class HaDeviceActionsZWaveJS extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  @internalProperty() private _entryId?: string;

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("device")) {
      this._entryId = this.device.config_entries[0];
    }
  }

  protected render(): TemplateResult {
    return html`
      <a .href=${`/config/zwave_js/node_config/${this.device.id}?config_entry=${this._entryId}`}></a>
        <mwc-button>
          ${this.hass.localize(
            "ui.panel.config.zwave_js.device_info.device_config"
          )}
        </mwc-button>
      </a>
    `;
  }
}
