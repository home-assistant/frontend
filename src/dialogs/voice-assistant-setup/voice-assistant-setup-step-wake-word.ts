import type { UnsubscribeFunc } from "home-assistant-js-websocket";
import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-button";
import "../../components/ha-dialog-header";
import type { AssistSatelliteConfiguration } from "../../data/assist_satellite";
import { interceptWakeWord } from "../../data/assist_satellite";
import type { HomeAssistant } from "../../types";
import { AssistantSetupStyles } from "./styles";
import { STEP } from "./voice-assistant-setup-dialog";
import type { EntityRegistryDisplayEntry } from "../../data/entity_registry";
import { computeDomain } from "../../common/entity/compute_domain";

@customElement("ha-voice-assistant-setup-step-wake-word")
export class HaVoiceAssistantSetupStepWakeWord extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public assistConfiguration?: AssistSatelliteConfiguration;

  @property() public assistEntityId?: string;

  @property({ attribute: false })
  public deviceEntities?: EntityRegistryDisplayEntry[];

  @state() public _muteSwitchEntity?: string;

  @state() private _detected = false;

  @state() private _timedout = false;

  private _sub?: Promise<UnsubscribeFunc>;

  private _timeout?: number;

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this._stopListeningWakeWord();
  }

  protected override willUpdate(changedProperties: PropertyValues) {
    super.willUpdate(changedProperties);

    if (changedProperties.has("assistEntityId")) {
      this._detected = false;
      this._muteSwitchEntity = this.deviceEntities?.find(
        (ent) =>
          computeDomain(ent.entity_id) === "switch" &&
          ent.entity_id.includes("mute")
      )?.entity_id;
      if (!this._muteSwitchEntity) {
        this._startTimeOut();
      }
      this._listenWakeWord();
    }
  }

  private _startTimeOut() {
    this._timeout = window.setTimeout(() => {
      this._timeout = undefined;
      this._timedout = true;
    }, 15000);
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
          <img src="/static/images/voice-assistant/sleep.png" />
          <h1>
            Say “${this._activeWakeWord(this.assistConfiguration)}” to wake the
            device up
          </h1>
          <p class="secondary">Setup will continue once the device is awake.</p>
        </div>`
          : html`<img src="/static/images/voice-assistant/ok-nabu.png" />
              <h1>
                Say “${this._activeWakeWord(this.assistConfiguration)}” again
              </h1>
              <p class="secondary">
                To make sure the wake word works for you.
              </p>`}
        ${this._timedout
          ? html`<ha-alert alert-type="warning"
              >We have not heard the wake word, is your device muted?</ha-alert
            >`
          : this._muteSwitchEntity &&
              this.hass.states[this._muteSwitchEntity].state === "on"
            ? html`<ha-alert alert-type="warning" title="Your device is muted"
                >Please unmute your device to continue.</ha-alert
              >`
            : nothing}
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
      this._timedout = false;
      clearTimeout(this._timeout);
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
