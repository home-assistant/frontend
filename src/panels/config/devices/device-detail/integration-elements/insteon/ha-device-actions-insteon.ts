import {
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  internalProperty,
  TemplateResult,
  css,
  PropertyValues,
} from "lit-element";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import { haStyle } from "../../../../../../resources/styles";
import { HomeAssistant } from "../../../../../../types";
import {
  InsteonDevice,
  fetchInsteonDevice,
} from "../../../../../../data/insteon";
import { navigate } from "../../../../../../common/navigate";
import "@material/mwc-button/mwc-button";

@customElement("ha-device-actions-insteon")
export class HaDeviceActionsInsteon extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @internalProperty() private _insteonDevice?: InsteonDevice;

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("device")) {
      fetchInsteonDevice(this.hass, this.device!.id).then((device) => {
        this._insteonDevice = device;
      });
    }
  }

  protected render(): TemplateResult {
    if (!this._insteonDevice) {
      return html``;
    }
    return html`
      <mwc-button @click=${this._onManageALDBClick}>
        ${this.hass!.localize("ui.panel.config.insteon.aldb.actions.manage")}
      </mwc-button>
      <mwc-button @click=${this._onManagePropertiesClick}>
        ${this.hass!.localize(
          "ui.panel.config.insteon.properties.actions.manage"
        )}
      </mwc-button>
    `;
  }

  private async _onManageALDBClick(): Promise<void> {
    navigate(this, "/config/insteon/device/aldb/" + this.device.id);
  }

  private async _onManagePropertiesClick(): Promise<void> {
    navigate(this, "/config/insteon/device/properties/" + this.device.id);
  }

  static get styles(): CSSResult[] {
    return [
      haStyle,
      css`
        :host {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-actions-insteon": HaDeviceActionsInsteon;
  }
}
