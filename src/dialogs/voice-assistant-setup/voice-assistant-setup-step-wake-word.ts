import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { html, LitElement, nothing, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-button";
import "../../components/ha-dialog-header";
import {
  AssistSatelliteConfiguration,
  interceptWakeWord,
} from "../../data/assist_satellite";
import { HomeAssistant } from "../../types";
import { AssistantSetupStyles } from "./styles";
import { STEP } from "./voice-assistant-setup-dialog";

@customElement("ha-voice-assistant-setup-step-wake-word")
export class HaVoiceAssistantSetupStepWakeWord extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public assistConfiguration?: AssistSatelliteConfiguration;

  @property() public assistEntityId?: string;

  @state() private _detected = false;

  private _sub?: Promise<UnsubscribeFunc>;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopListeningWakeWord();
  }

  protected override willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties);

    if (changedProperties.has("assistEntityId")) {
      this._detected = false;
      this._listenWakeWord();
    }
  }

  private _activeWakeWord = memoizeOne(
    (config: AssistSatelliteConfiguration | undefined) => {
      if (!config) {
        return "";
      }
      const activeId = config.active_wake_words[0];
      return config.available_wake_words.find((ww) => ww.id === activeId)
        ?.wake_word;
    }
  );

  protected override render() {
    if (!this.assistEntityId) {
      return nothing;
    }

    const entityState = this.hass.states[this.assistEntityId];

    if (entityState.state !== "idle") {
      return html`<ha-circular-progress indeterminate></ha-circular-progress>`;
    }

    return html`<div class="content">
        ${!this._detected
          ? html`
          <img src="/static/images/voice-assistant/sleep.gif" />
          <h1>
            Say “${this._activeWakeWord(this.assistConfiguration)}” to wake the
            device up
          </h1>
          <p class="secondary">Setup will continue once the device is awake.</p>
        </div>`
          : html`<img src="/static/images/voice-assistant/ok-nabu.gif" />
              <h1>
                Say “${this._activeWakeWord(this.assistConfiguration)}” again
              </h1>
              <p class="secondary">
                To make sure the wake word works for you.
              </p>`}
      </div>
      <div class="footer centered">
        <ha-button @click=${this._changeWakeWord}>Change wake word</ha-button>
      </div>`;
  }

  private async _listenWakeWord() {
    const entityId = this.assistEntityId;
    if (!entityId) {
      return;
    }
    await this._stopListeningWakeWord();
    this._sub = interceptWakeWord(this.hass, entityId, () => {
      this._stopListeningWakeWord();
      if (this._detected) {
        this._nextStep();
      } else {
        this._detected = true;
        this._listenWakeWord();
      }
    });
  }

  private async _stopListeningWakeWord() {
    try {
      (await this._sub)?.();
    } catch (_e) {
      // ignore
    }
    this._sub = undefined;
  }

  private _nextStep() {
    fireEvent(this, "next-step");
  }

  private _changeWakeWord() {
    fireEvent(this, "next-step", { step: STEP.CHANGE_WAKEWORD });
  }

  static styles = AssistantSetupStyles;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-voice-assistant-setup-step-wake-word": HaVoiceAssistantSetupStepWakeWord;
  }
}
