import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  nothing,
  PropertyValues,
} from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { debounce } from "../common/util/debounce";
import { listTTSVoices, TTSVoice } from "../data/tts";
import { HomeAssistant } from "../types";
import "./ha-list-item";
import "./ha-select";
import type { HaSelect } from "./ha-select";

const NONE = "__NONE_OPTION__";

@customElement("ha-tts-voice-picker")
export class HaTTSVoicePicker extends LitElement {
  @property() public value?: string;

  @property() public label?: string;

  @property() public engineId?: string;

  @property() public language?: string;

  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Boolean, reflect: true }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @state() _voices?: TTSVoice[] | null;

  @query("ha-select") private _select?: HaSelect;

  protected render() {
    if (!this._voices) {
      return nothing;
    }
    const value =
      this.value ?? (this.required ? this._voices[0]?.voice_id : NONE);
    return html`
      <ha-select
        .label=${this.label ||
        this.hass!.localize("ui.components.tts-voice-picker.voice")}
        .value=${value}
        .required=${this.required}
        .disabled=${this.disabled}
        @selected=${this._changed}
        @closed=${stopPropagation}
        fixedMenuPosition
        naturalMenuWidth
      >
        ${!this.required
          ? html`<ha-list-item .value=${NONE}>
              ${this.hass!.localize("ui.components.tts-voice-picker.none")}
            </ha-list-item>`
          : nothing}
        ${this._voices.map(
          (voice) =>
            html`<ha-list-item .value=${voice.voice_id}>
              ${voice.name}
            </ha-list-item>`
        )}
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

  protected updated(changedProperties: PropertyValues<this>) {
    super.updated(changedProperties);
    if (
      changedProperties.has("_voices") &&
      this._select?.value !== this.value
    ) {
      this._select?.layoutOptions();
      fireEvent(this, "value-changed", { value: this._select?.value });
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-select {
        width: 100%;
      }
    `;
  }

  private _changed(ev): void {
    const target = ev.target as HaSelect;
    if (
      !this.hass ||
      target.value === "" ||
      target.value === this.value ||
      (this.value === undefined && target.value === NONE)
    ) {
      return;
    }
    this.value = target.value === NONE ? undefined : target.value;
    fireEvent(this, "value-changed", { value: this.value });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-tts-voice-picker": HaTTSVoicePicker;
  }
}
