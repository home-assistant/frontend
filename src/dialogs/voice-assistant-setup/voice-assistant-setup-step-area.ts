import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-area-picker";
import { updateDeviceRegistryEntry } from "../../data/device_registry";
import type { HomeAssistant } from "../../types";
import { showAlertDialog } from "../generic/show-dialog-box";
import { AssistantSetupStyles } from "./styles";

@customElement("ha-voice-assistant-setup-step-area")
export class HaVoiceAssistantSetupStepArea extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public deviceId!: string;

  protected override render() {
    const device = this.hass.devices[this.deviceId];

    return html`<div class="content">
        <img
          src="/static/images/voice-assistant/area.png"
          alt="Casita Home Assistant logo"
        />
        <h1>
          ${this.hass.localize(
            "ui.panel.config.voice_assistants.satellite_wizard.area.title"
          )}
        </h1>
        <p class="secondary">
          ${this.hass.localize(
            "ui.panel.config.voice_assistants.satellite_wizard.area.secondary"
          )}
        </p>
        <ha-area-picker
          .hass=${this.hass}
          .value=${device.area_id}
        ></ha-area-picker>
      </div>
      <div class="footer">
        <ha-button @click=${this._setArea}
          >${this.hass.localize("ui.common.next")}</ha-button
        >
      </div>`;
  }

  private async _setArea() {
    const area = this.shadowRoot!.querySelector("ha-area-picker")!.value;
    if (!area) {
      showAlertDialog(this, {
        text: this.hass.localize(
          "ui.panel.config.voice_assistants.satellite_wizard.area.no_selection"
        ),
      });
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
