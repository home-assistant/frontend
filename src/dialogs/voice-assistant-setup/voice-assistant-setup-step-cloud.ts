import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators";
import type { HomeAssistant } from "../../types";
import "./cloud/cloud-step-intro";
import "./cloud/cloud-step-signin";
import "./cloud/cloud-step-signup";
import { fireEvent } from "../../common/dom/fire_event";
import { STEP } from "./voice-assistant-setup-dialog";

@customElement("ha-voice-assistant-setup-step-cloud")
export class HaVoiceAssistantSetupStepCloud extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _state: "SIGNUP" | "SIGNIN" | "INTRO" = "INTRO";

  protected override render() {
    if (this._state === "SIGNUP") {
      return html`<cloud-step-signup
        .hass=${this.hass}
        @cloud-step=${this._cloudStep}
      ></cloud-step-signup>`;
    }
    if (this._state === "SIGNIN") {
      return html`<cloud-step-signin
        .hass=${this.hass}
        @cloud-step=${this._cloudStep}
      ></cloud-step-signin>`;
    }
    return html`<cloud-step-intro
      .hass=${this.hass}
      @cloud-step=${this._cloudStep}
    ></cloud-step-intro>`;
  }

  private _cloudStep(ev) {
    if (ev.detail.step === "DONE") {
      fireEvent(this, "next-step", {
        step: STEP.PIPELINE,
        noPrevious: true,
      });
      return;
    }
    this._state = ev.detail.step;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-assistant-setup-step-cloud": HaVoiceAssistantSetupStepCloud;
  }
  interface HASSDomEvents {
    "cloud-step": { step: "SIGNUP" | "SIGNIN" | "DONE" };
  }
}
