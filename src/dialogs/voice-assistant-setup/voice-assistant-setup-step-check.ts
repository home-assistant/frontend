import { html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { testAssistSatelliteConnection } from "../../data/assist_satellite";
import { HomeAssistant } from "../../types";
import { AssistantSetupStyles } from "./styles";

@customElement("ha-voice-assistant-setup-step-check")
export class HaVoiceAssistantSetupStepCheck extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public assistEntityId?: string;

  @state() private _status?: "success" | "timeout";

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
      ${this._status === "success"
        ? html`<img src="/static/icons/casita/smiling.png" />
            <h1>Hi</h1>
            <p class="secondary">
              With a couple of steps we are going to setup your voice assistant.
            </p>`
        : this._status === "timeout"
          ? html`<img src="/static/icons/casita/sad.png" />
              <h1>Voice assistant can not connect to Home Assistant</h1>
              <p class="secondary">
                A good explanation what is happening and what action you should
                take.
              </p>
              <div class="footer">
                <a href="#"><ha-button>Help me</ha-button></a>
                <ha-button @click=${this._testConnection}>Retry</ha-button>
              </div>`
          : html`<img src="/static/icons/casita/loading.png" />
              <h1>Checking...</h1>
              <p class="secondary">
                We are checking if the device can reach your Home Assistant
                instance.
              </p>
              <ha-circular-progress indeterminate></ha-circular-progress>`}
    </div>`;
  }

  private async _testConnection() {
    this._status = undefined;
    const result = await testAssistSatelliteConnection(
      this.hass,
      this.assistEntityId!
    );
    this._status = result.status;
  }

  private _nextStep() {
    fireEvent(this, "next-step", { noPrevious: true });
  }

  private _close() {
    fireEvent(this, "closed");
  }

  static styles = AssistantSetupStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-assistant-setup-step-check": HaVoiceAssistantSetupStepCheck;
  }
}
