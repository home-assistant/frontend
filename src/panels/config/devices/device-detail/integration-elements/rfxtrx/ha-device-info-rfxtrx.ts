import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import {
  getIdentifiersFromDevice,
  RfxtrxNodeIdentifiers,
} from "../../../../../../data/rfxtrx";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";

@customElement("ha-device-info-rfxtrx")
export class HaDeviceInfoRfxtrx extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @state() private _identifiers?: RfxtrxNodeIdentifiers;

  public willUpdate(changedProperties: PropertyValues) {
    if (changedProperties.has("device")) {
      this._identifiers = getIdentifiersFromDevice(this.device);
    }
  }

  protected render(): TemplateResult {
    if (!this._identifiers) {
      return html``;
    }
    return html`
      <div class="extra-info">
        ${this.hass.localize(
          "ui.panel.config.rfxtrx.device.id_string",
          "id_string",
          this._identifiers.id_string
        )}
      </div>
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-info-rfxtrx": HaDeviceInfoRfxtrx;
  }
}
