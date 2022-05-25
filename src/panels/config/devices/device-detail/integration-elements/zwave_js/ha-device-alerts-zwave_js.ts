import { html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { DeviceRegistryEntry } from "../../../../../../data/device_registry";
import {
  ZwaveJSNodeComments,
  fetchZwaveNodeComments,
} from "../../../../../../data/zwave_js";
import { HomeAssistant } from "../../../../../../types";

@customElement("ha-device-alerts-zwave_js")
export class HaDeviceAlertsZWaveJS extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public device!: DeviceRegistryEntry;

  @state() private _nodeComments?: ZwaveJSNodeComments;

  protected willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties);
    if (changedProperties.has("device")) {
      this._fetchNodeDetails();
    }
  }

  private async _fetchNodeDetails() {
    this._nodeComments = await fetchZwaveNodeComments(
      this.hass,
      this.device.id
    );
  }

  protected render(): TemplateResult {
    if (this._nodeComments && this._nodeComments.comments?.length > 0) {
      return html`
        <div>
          ${this._nodeComments.comments.map(
            (comment) => html`<ha-alert .alertType=${comment.level}>
              ${comment.text}
            </ha-alert>`
          )}
        </div>
      `;
    }
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-device-alerts-zwave_js": HaDeviceAlertsZWaveJS;
  }
}
