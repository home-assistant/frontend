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
        <img src="/static/icons/casita/loving.png" />
        <h1>Home Assistant Cloud</h1>
        <p class="secondary">
          With Home Assistant Cloud, you get the best results for your voice
          assistant, sign up for a free trial now.
        </p>
      </div>
      <div class="footer">
        <a href="/config/cloud/register" @click=${this._close}
          ><ha-button>Start your free trial</ha-button></a
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
