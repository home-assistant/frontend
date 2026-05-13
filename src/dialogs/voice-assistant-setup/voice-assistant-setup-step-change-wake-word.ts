import { css, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/item/ha-list-item-button";
import type { HaListItemButton } from "../../components/item/ha-list-item-button";
import "../../components/list/ha-list-base";
import type { AssistSatelliteConfiguration } from "../../data/assist_satellite";
import { setWakeWords } from "../../data/assist_satellite";
import type { HomeAssistant } from "../../types";
import { AssistantSetupStyles } from "./styles";
import { STEP } from "./voice-assistant-setup-dialog";

@customElement("ha-voice-assistant-setup-step-change-wake-word")
export class HaVoiceAssistantSetupStepChangeWakeWord extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public assistConfiguration?: AssistSatelliteConfiguration;

  @property({ attribute: false }) public assistEntityId?: string;

  protected override render() {
    return html`<div class="padding content">
        <img
          src="/static/images/voice-assistant/change-wake-word.png"
          alt="Casita Home Assistant logo"
        />
        <h1>
          ${this.hass.localize(
            "ui.panel.config.voice_assistants.satellite_wizard.change_wake_word.title"
          )}
        </h1>
        <p class="secondary">
          ${this.hass.localize(
            "ui.panel.config.voice_assistants.satellite_wizard.change_wake_word.secondary"
          )}
        </p>
      </div>
      <ha-list-base>
        ${this.assistConfiguration!.available_wake_words.map(
          (wakeWord) =>
            html`<ha-list-item-button
              @click=${this._wakeWordPicked}
              .value=${wakeWord.id}
            >
              ${wakeWord.wake_word}
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-list-item-button>`
        )}
      </ha-list-base>`;
  }

  private async _wakeWordPicked(ev: Event) {
    if (!this.assistEntityId) {
      return;
    }

    const wakeWordId = (
      ev.currentTarget as HaListItemButton & { value: string }
    ).value;

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
      ha-list-base {
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
