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
import { navigate } from "../../../../../../common/navigate";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import {
  getIdentifiersFromDevice,
  ZWaveJSNodeIdentifiers,
} from "../../../../../../data/zwave_js";

import { haStyle } from "../../../../../../resources/styles";
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
      <mwc-button @click=${this._nodeConfigClicked}>
        ${this.hass.localize(
          "ui.panel.config.zwave_js.device_info.device_config"
        )}
      </mwc-button>
    `;
  }

  private _nodeConfigClicked() {
    navigate(
      this,
      `/config/zwave_js/node_config/${this.device.id}?config_entry=${this._entryId}`
    );
  }

  static get styles(): CSSResult[] {
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
      `,
    ];
  }
}
