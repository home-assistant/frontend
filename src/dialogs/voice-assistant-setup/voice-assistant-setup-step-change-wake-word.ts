import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import {
  AssistSatelliteConfiguration,
  setWakeWords,
} from "../../data/assist_satellite";
import { HomeAssistant } from "../../types";
import { STEP } from "./voice-assistant-setup-dialog";
import { AssistantSetupStyles } from "./styles";
import "../../components/ha-md-list";
import "../../components/ha-md-list-item";
import { formatLanguageCode } from "../../common/language/format_language";

@customElement("ha-voice-assistant-setup-step-change-wake-word")
export class HaVoiceAssistantSetupStepChangeWakeWord extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public assistConfiguration?: AssistSatelliteConfiguration;

  @property() public assistEntityId?: string;

  protected override render() {
    return html`<div class="padding content">
        <img src="/static/images/voice-assistant/change-wake-word.gif" />
        <h1>Change wake word</h1>
        <p class="secondary">
          Some wake words are better for
          ${formatLanguageCode(this.hass.locale.language, this.hass.locale)} and
          voice than others. Please try them out.
        </p>
      </div>
      <ha-md-list>
        ${this.assistConfiguration!.available_wake_words.map(
          (wakeWord) =>
            html`<ha-md-list-item
              interactive
              type="button"
              @click=${this._wakeWordPicked}
              .value=${wakeWord.id}
            >
              ${wakeWord.wake_word}
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>`
        )}
      </ha-md-list>`;
  }

  private async _wakeWordPicked(ev) {
    if (!this.assistEntityId) {
      return;
    }

    const wakeWordId = ev.currentTarget.value;

    await setWakeWords(this.hass, this.assistEntityId, [wakeWordId]);
    this._nextStep();
  }

  private _nextStep() {
    fireEvent(this, "next-step", { step: STEP.WAKEWORD, updateConfig: true });
  }

  static styles = [
    AssistantSetupStyles,
    css`
      :host {
        padding: 0;
      }
      .padding {
        padding: 24px;
      }
      ha-md-list {
        width: 100%;
        text-align: initial;
        margin-bottom: 24px;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-assistant-setup-step-change-wake-word": HaVoiceAssistantSetupStepChangeWakeWord;
  }
}
