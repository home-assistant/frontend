import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { updateDeviceRegistryEntry } from "../../data/device_registry";
import { HomeAssistant } from "../../types";
import { showAlertDialog } from "../generic/show-dialog-box";
import { AssistantSetupStyles } from "./styles";

@customElement("ha-voice-assistant-setup-step-area")
export class HaVoiceAssistantSetupStepArea extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public deviceId!: string;

  protected override render() {
    const device = this.hass.devices[this.deviceId];

    return html`<div class="content">
        <img src="/static/images/voice-assistant/area.gif" />
        <h1>Select area</h1>
        <p class="secondary">
          When you voice assistant knows where it is, it can better control the
          devices around it.
        </p>
        <ha-area-picker
          .hass=${this.hass}
          .value=${device.area_id}
        ></ha-area-picker>
      </div>
      <div class="footer">
        <ha-button @click=${this._setArea} unelevated>Next</ha-button>
      </div>`;
  }

  private async _setArea() {
    const area = this.shadowRoot!.querySelector("ha-area-picker")!.value;
    if (!area) {
      showAlertDialog(this, { text: "Please select an area" });
      return;
    }
    await updateDeviceRegistryEntry(this.hass, this.deviceId, {
      area_id: area,
    });
    this._nextStep();
  }

  private _nextStep() {
    fireEvent(this, "next-step");
  }

  static styles = [
    AssistantSetupStyles,
    css`
      ha-area-picker {
        display: block;
        width: 100%;
        margin-bottom: 24px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-assistant-setup-step-area": HaVoiceAssistantSetupStepArea;
  }
}
