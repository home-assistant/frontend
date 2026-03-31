import type { PropertyValues } from "lit";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import type { HaDropdownSelectEvent } from "../../../components/ha-dropdown";
import "../../../components/ha-control-select-menu";
import "../../../components/ha-list-item";
import { UNAVAILABLE } from "../../../data/entity/entity";
import {
  MediaPlayerEntityFeature,
  type MediaPlayerEntity,
} from "../../../data/media-player";
import type { HomeAssistant } from "../../../types";
import { hasConfigChanged } from "../common/has-changed";
import type { LovelaceCardFeature } from "../types";
import { cardFeatureStyles } from "./common/card-feature-styles";
import type {
  LovelaceCardFeatureContext,
  MediaPlayerSoundModeCardFeatureConfig,
} from "./types";

export const supportsMediaPlayerSoundModeCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "media_player" &&
    supportsFeature(stateObj, MediaPlayerEntityFeature.SELECT_SOUND_MODE) &&
    !!stateObj.attributes.sound_mode_list?.length
  );
};

@customElement("hui-media-player-sound-mode-card-feature")
class HuiMediaPlayerSoundModeCardFeature
  extends LitElement
  implements LovelaceCardFeature
{
  @property({ attribute: false }) public hass?: HomeAssistant;

  @property({ attribute: false }) public context?: LovelaceCardFeatureContext;

  @state() private _config?: MediaPlayerSoundModeCardFeatureConfig;

  @state() private _currentSoundMode?: string;

  private get _stateObj() {
    if (!this.hass || !this.context || !this.context.entity_id) {
      return undefined;
    }
    return this.hass.states[this.context.entity_id!] as
      | MediaPlayerEntity
      | undefined;
  }

  static getStubConfig(): MediaPlayerSoundModeCardFeatureConfig {
    return {
      type: "media-player-sound-mode",
    };
  }

  public setConfig(config: MediaPlayerSoundModeCardFeatureConfig): void {
    if (!config) {
      throw new Error("Invalid configuration");
    }
    this._config = config;
  }

  protected willUpdate(changedProps: PropertyValues): void {
    super.willUpdate(changedProps);
    if (
      (changedProps.has("hass") || changedProps.has("context")) &&
      this._stateObj
    ) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      const oldStateObj = oldHass?.states[this.context!.entity_id!];
      if (oldStateObj !== this._stateObj) {
        this._currentSoundMode = this._stateObj.attributes.sound_mode;
      }
    }
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    const entityId = this.context?.entity_id;
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    return (
      changedProps.has("_currentSoundMode") ||
      changedProps.has("context") ||
      hasConfigChanged(this, changedProps) ||
      (changedProps.has("hass") &&
        (!oldHass ||
          !entityId ||
          oldHass.states[entityId] !== this.hass?.states[entityId]))
    );
  }

  private async _valueChanged(ev: HaDropdownSelectEvent) {
    const soundMode = ev.detail.item?.value;
    const oldSoundMode = this._stateObj!.attributes.sound_mode;

    if (soundMode === oldSoundMode || !soundMode) {
      return;
    }

    this._currentSoundMode = soundMode;

    try {
      await this.hass!.callService("media_player", "select_sound_mode", {
        entity_id: this._stateObj!.entity_id,
        sound_mode: soundMode,
      });
    } catch (_err) {
      this._currentSoundMode = oldSoundMode;
    }
  }

  protected render() {
    if (
      !this._config ||
      !this.hass ||
      !this.context ||
      !this._stateObj ||
      !supportsMediaPlayerSoundModeCardFeature(this.hass, this.context)
    ) {
      return nothing;
    }

    const options = this._stateObj.attributes.sound_mode_list!.map(
      (soundMode) => ({
        value: soundMode,
        label: this.hass!.formatEntityAttributeValue(
          this._stateObj!,
          "sound_mode",
          soundMode
        ),
      })
    );

    return html`
      <ha-control-select-menu
        .hass=${this.hass}
        show-arrow
        .label=${this.hass.localize("ui.card.media_player.sound_mode")}
        .value=${this._currentSoundMode}
        .disabled=${this._stateObj.state === UNAVAILABLE}
        .options=${options}
        @wa-select=${this._valueChanged}
      >
      </ha-control-select-menu>
    `;
  }

  static get styles() {
    return cardFeatureStyles;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-sound-mode-card-feature": HuiMediaPlayerSoundModeCardFeature;
  }
}
