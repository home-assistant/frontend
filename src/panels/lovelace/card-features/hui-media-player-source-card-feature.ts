import type { PropertyValues } from "lit";
import { customElement } from "lit/decorators";
import { computeDomain } from "../../../common/entity/compute_domain";
import { supportsFeature } from "../../../common/entity/supports-feature";
import {
  MediaPlayerEntityFeature,
  type MediaPlayerEntity,
} from "../../../data/media-player";
import type { HomeAssistant } from "../../../types";
import { hasConfigChanged } from "../common/has-changed";
import type { LovelaceCardFeature } from "../types";
import { HuiModeSelectCardFeatureBase } from "./hui-mode-select-card-feature-base";
import type {
  LovelaceCardFeatureContext,
  MediaPlayerSourceCardFeatureConfig,
} from "./types";

export const supportsMediaPlayerSourceCardFeature = (
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
    supportsFeature(stateObj, MediaPlayerEntityFeature.SELECT_SOURCE) &&
    !!stateObj.attributes.source_list?.length
  );
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
    return undefined;
  }

  protected readonly _serviceDomain = "media_player";

  protected readonly _serviceAction = "select_source";

  protected get _label(): string {
    return this.hass!.localize("ui.card.media_player.source");
  }

  protected readonly _hideLabel = false;

  protected readonly _showDropdownOptionIcons = false;

  protected readonly _allowIconsStyle = false;

  static getStubConfig(): MediaPlayerSourceCardFeatureConfig {
    return {
      type: "media-player-source",
    };
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    const entityId = this.context?.entity_id;
    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;

    return (
      changedProps.has("_currentValue") ||
      changedProps.has("context") ||
      hasConfigChanged(this, changedProps) ||
      (changedProps.has("hass") &&
        (!oldHass ||
          !entityId ||
          oldHass.states[entityId] !== this.hass?.states[entityId]))
    );
  }

  protected _isSupported(): boolean {
    return !!(
      this.hass &&
      this.context &&
      supportsMediaPlayerSourceCardFeature(this.hass, this.context)
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-media-player-source-card-feature": HuiMediaPlayerSourceCardFeature;
  }
}
