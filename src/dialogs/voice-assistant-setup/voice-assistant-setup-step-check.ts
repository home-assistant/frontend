import { html, LitElement, nothing, type PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-button";
import "../../components/ha-circular-progress";
import { testAssistSatelliteConnection } from "../../data/assist_satellite";
import type { HomeAssistant } from "../../types";
import { AssistantSetupStyles } from "./styles";
import { documentationUrl } from "../../util/documentation-url";

@customElement("ha-voice-assistant-setup-step-check")
export class HaVoiceAssistantSetupStepCheck extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public assistEntityId?: string;

  @state() private _status?: "success" | "timeout";

  @state() private _showLoader = false;

  protected override willUpdate(changedProperties: PropertyValues): void {
    super.willUpdate(changedProperties);
    if (!this.hasUpdated) {
      this._testConnection();
      return;
    }
    if (
      this._status === "success" &&
      changedProperties.has("hass") &&
      this.hass.states[this.assistEntityId!]?.state === "idle"
    ) {
      this._nextStep();
    }
  }

  protected override render() {
    return html`<div class="content">
      ${this._status === "timeout"
        ? html`<img
              src="/static/images/voice-assistant/error.png"
              alt="Casita Home Assistant error logo"
            />
            <h1>The voice assistant is unable to connect to Home Assistant</h1>
            <p class="secondary">
              To play audio, the voice assistant device has to connect to Home
              Assistant to fetch the files. Our test shows that the device is
              unable to reach the Home Assistant server.
            </p>
            <div class="footer">
              <a
                href=${documentationUrl(
                  this.hass,
                  "/voice_control/troubleshooting/#i-dont-get-a-voice-response"
                )}
                ><ha-button>Help me</ha-button></a
              >
              <ha-button @click=${this._testConnection}>Retry</ha-button>
            </div>`
        : html`<img
              src="/static/images/voice-assistant/hi.png"
              alt="Casita Home Assistant hi logo"
            />
            <h1>Hi</h1>
            <p class="secondary">
              Over the next couple steps we're going to personalize your voice
              assistant.
            </p>

            ${this._showLoader
              ? html`<ha-circular-progress
                  indeterminate
                ></ha-circular-progress>`
              : nothing} `}
    </div>`;
  }

  private async _testConnection() {
    this._status = undefined;
    this._showLoader = false;
    const timeout = setTimeout(() => {
      this._showLoader = true;
    }, 3000);
    const result = await testAssistSatelliteConnection(
      this.hass,
      this.assistEntityId!
    );
    clearTimeout(timeout);
    this._showLoader = false;
    this._status = result.status;
  }

  private _nextStep() {
    fireEvent(this, "next-step", { noPrevious: true });
  }

  static styles = AssistantSetupStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-assistant-setup-step-check": HaVoiceAssistantSetupStepCheck;
  }
}
