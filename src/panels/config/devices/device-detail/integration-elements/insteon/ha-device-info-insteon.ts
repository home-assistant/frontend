import {
  css,
  CSSResult,
  html,
  LitElement,
  TemplateResult,
  PropertyValues,
} from "lit";
import { customElement, property } from "lit/decorators";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant, Route } from "../../../../../../types";
import {
  InsteonDevice,
  fetchInsteonDevice,
} from "../../../../../../data/insteon";

@customElement("ha-device-info-insteon")
export class HaDeviceActionsInsteon extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public device!: DeviceRegistryEntry;

  @property() public route!: Route;

  private _insteonDevice?: InsteonDevice;

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("device")) {
      fetchInsteonDevice(this.hass, this.device.id).then((device) => {
        this._insteonDevice = device;
      });
    }
  }

  protected render(): TemplateResult {
    if (!this._insteonDevice) {
      return html``;
    }
    return html`
      <h4>Insteon info</h4>
      <div>
        ${this.hass!.localize("ui.panel.config.insteon.aldb.status.caption")}:
        ${this.hass!.localize(
          "ui.panel.config.insteon.aldb.status." +
            this._insteonDevice!.aldb_status
        )}
      </div>
    `;
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

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-info-insteon": HaDeviceActionsInsteon;
  }
}
