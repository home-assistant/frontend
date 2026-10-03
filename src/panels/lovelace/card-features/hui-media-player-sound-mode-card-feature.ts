import type { PropertyValues } from "lit";
import type { HassEntity } from "home-assistant-js-websocket";
import { customElement } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import {
  MediaPlayerEntityFeature,
  type MediaPlayerEntity,
} from "../../../data/media-player";
import type { HomeAssistant } from "../../../types";
import { hasConfigChanged } from "../common/has-changed";
import type { LovelaceCardFeature, LovelaceCardFeatureEditor } from "../types";
import { HuiModeSelectCardFeatureBase } from "./hui-mode-select-card-feature-base";
import type {
  LovelaceCardFeatureContext,
  MediaPlayerSoundModeCardFeatureConfig,
} from "./types";

const supportsMediaPlayerSoundModeCardFeatureFromState = (
  stateObj: HassEntity
) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "media_player" &&
    supportsFeature(stateObj, MediaPlayerEntityFeature.SELECT_SOUND_MODE) &&
    !!stateObj.attributes.sound_mode_list?.length
  );
};

export const supportsMediaPlayerSoundModeCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsMediaPlayerSoundModeCardFeatureFromState(stateObj);
};

@customElement("hui-media-player-sound-mode-card-feature")
class HuiMediaPlayerSoundModeCardFeature
  extends HuiModeSelectCardFeatureBase<
    MediaPlayerEntity,
    MediaPlayerSoundModeCardFeatureConfig
  >
  implements LovelaceCardFeature
{
  protected readonly _attribute = "sound_mode";

  protected readonly _modesAttribute = "sound_mode_list";

  protected readonly _serviceDomain = "media_player";

  protected readonly _serviceAction = "select_sound_mode";

  protected get _label(): string {
    return this._localize("ui.card.media_player.sound_mode");
  }

  protected readonly _hideLabel = false;

  protected readonly _showDropdownOptionIcons = false;

  protected readonly _allowIconsStyle = false;

  static getStubConfig(): MediaPlayerSoundModeCardFeatureConfig {
    return {
      type: "media-player-sound-mode",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-media-player-sound-mode-card-feature-editor");
    return document.createElement(
      "hui-media-player-sound-mode-card-feature-editor"
    );
  }

  protected get _configuredModes() {
    const soundModes = this._config?.sound_modes;
    return soundModes?.length ? soundModes : undefined;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    return (
      changedProps.has("_currentValue") ||
      changedProps.has("context") ||
      changedProps.has("_stateObj") ||
      hasConfigChanged(this, changedProps)
    );
  }

  protected _isSupported(): boolean {
    return !!(
      this._stateObj &&
      supportsMediaPlayerSoundModeCardFeatureFromState(this._stateObj)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-sound-mode-card-feature": HuiMediaPlayerSoundModeCardFeature;
  }
}
