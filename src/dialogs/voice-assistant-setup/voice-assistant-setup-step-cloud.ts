import { html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import { HomeAssistant } from "../../types";
import { AssistantSetupStyles } from "./styles";

@customElement("ha-voice-assistant-setup-step-cloud")
export class HaVoiceAssistantSetupStepCloud extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected override render() {
    return html`<div class="content">
        <img src="/static/images/logo_nabu_casa.png" />
        <h1>Supercharge your assistant with Home Assistant Cloud</h1>
        <p class="secondary">
          Speed up and take the load off your system by running your
          text-to-speech and speech-to-text in our private and secure cloud.
          Cloud also includes secure remote access to your system while
          supporting the development of Home Assistant.
        </p>
      </div>
      <div class="footer side-by-side">
        <a
          href="https://www.nabucasa.com"
          target="_blank"
          rel="noreferrer noopenner"
          ><ha-button>Learn more</ha-button></a
        >
        <a href="/config/cloud/register" @click=${this._close}
          ><ha-button unelevated>Try 1 month for free</ha-button></a
        >
      </div>`;
  }

  private _close() {
    fireEvent(this, "closed");
  }

  static styles = AssistantSetupStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-assistant-setup-step-cloud": HaVoiceAssistantSetupStepCloud;
  }
}
