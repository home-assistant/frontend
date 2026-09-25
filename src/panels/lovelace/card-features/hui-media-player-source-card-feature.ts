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
  MediaPlayerSourceCardFeatureConfig,
} from "./types";

const supportsMediaPlayerSourceCardFeatureFromState = (
  stateObj: HassEntity
) => {
  const domain = computeDomain(stateObj.entity_id);
  return (
    domain === "media_player" &&
    supportsFeature(stateObj, MediaPlayerEntityFeature.SELECT_SOURCE)
  );
};

export const supportsMediaPlayerSourceCardFeature = (
  hass: HomeAssistant,
  context: LovelaceCardFeatureContext
) => {
  const stateObj = context.entity_id
    ? hass.states[context.entity_id]
    : undefined;
  if (!stateObj) return false;
  return supportsMediaPlayerSourceCardFeatureFromState(stateObj);
};

@customElement("hui-media-player-source-card-feature")
class HuiMediaPlayerSourceCardFeature
  extends HuiModeSelectCardFeatureBase<
    MediaPlayerEntity,
    MediaPlayerSourceCardFeatureConfig
  >
  implements LovelaceCardFeature
{
  protected readonly _attribute = "source";

  protected readonly _modesAttribute = "source_list";

  protected get _configuredModes() {
    const sources = this._config?.sources;
    return sources?.length ? sources : undefined;
  }

  protected readonly _serviceDomain = "media_player";

  protected readonly _serviceAction = "select_source";

  protected get _label(): string {
    return this._localize("ui.card.media_player.source");
  }

  protected readonly _hideLabel = false;

  protected readonly _showDropdownOptionIcons = false;

  protected readonly _allowIconsStyle = false;

  static getStubConfig(): MediaPlayerSourceCardFeatureConfig {
    return {
      type: "media-player-source",
    };
  }

  public static async getConfigElement(): Promise<LovelaceCardFeatureEditor> {
    await import("../editor/config-elements/hui-media-player-source-card-feature-editor");
    return document.createElement(
      "hui-media-player-source-card-feature-editor"
    );
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
      supportsMediaPlayerSourceCardFeatureFromState(this._stateObj)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-source-card-feature": HuiMediaPlayerSourceCardFeature;
  }
}
