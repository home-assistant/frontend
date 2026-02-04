import type { PropertyValues } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { debounce } from "../common/util/debounce";
import type { TTSVoice } from "../data/tts";
import { listTTSVoices } from "../data/tts";
import type { HomeAssistant } from "../types";
import "./ha-select";
import type { HaSelectOption } from "./ha-select";

const NONE = "__NONE_OPTION__";

@customElement("ha-tts-voice-picker")
export class HaTTSVoicePicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property({ attribute: false }) public engineId?: string;

  @property() public language?: string;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state() _voices?: TTSVoice[] | null;

  protected render() {
    if (!this._voices) {
      return nothing;
    }
    const value =
      this.value ?? (this.required ? this._voices[0]?.voice_id : NONE);

    const options: HaSelectOption[] = (this._voices || []).map((voice) => ({
      value: voice.voice_id,
      label: voice.name,
    }));

    if (!this.required || !this.value) {
      options.unshift({
        value: NONE,
        label: this.hass!.localize("ui.components.tts-voice-picker.none"),
      });
    }

    return html`
      <ha-select
        .label=${this.label ||
        this.hass!.localize("ui.components.tts-voice-picker.voice")}
        .value=${value}
        .required=${this.required}
        .disabled=${this.disabled}
        @selected=${this._changed}
        .options=${options}
      >
      </ha-select>
    `;
  }

  protected willUpdate(changedProperties: PropertyValues<this>): void {
    super.willUpdate(changedProperties);
    if (!this.hasUpdated) {
      this._updateVoices();
    } else if (
      changedProperties.has("language") ||
      changedProperties.has("engineId")
    ) {
      this._debouncedUpdateVoices();
    }
  }

  private _debouncedUpdateVoices = debounce(() => this._updateVoices(), 500);

  private async _updateVoices() {
    if (!this.engineId || !this.language) {
      this._voices = undefined;
      return;
    }
    this._voices = (
      await listTTSVoices(this.hass, this.engineId, this.language)
    ).voices;

    if (!this.value) {
      return;
    }

    if (
      !this._voices ||
      !this._voices.find((voice) => voice.voice_id === this.value)
    ) {
      this.value = undefined;
      fireEvent(this, "value-changed", { value: this.value });
    }
  }

  static styles = css`
    ha-select {
      width: 100%;
      text-align: start;
      display: block;
    }
  `;

  private _changed(ev: CustomEvent<{ value: string }>): void {
    const value = ev.detail.value;
    if (
      !this.hass ||
      value === "" ||
      value === this.value ||
      (this.value === undefined && value === NONE)
    ) {
      return;
    }
    this.value = value === NONE ? undefined : value;
    fireEvent(this, "value-changed", { value: this.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tts-voice-picker": HaTTSVoicePicker;
  }
}
