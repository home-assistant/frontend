import { mdiVolumeHigh, mdiVolumeOff } from "@mdi/js";
import { html, nothing } from "lit";
import type { TemplateResult } from "lit";
import { supportsFeature } from "../../../../common/entity/supports-feature";
import "../../../../components/ha-control-button";
import "../../../../components/ha-svg-icon";
import { forwardHaptic } from "../../../../data/haptics";
import {
  MediaPlayerEntityFeature,
  type MediaPlayerEntity,
} from "../../../../data/media-player";
import type { HomeAssistant } from "../../../../types";

export const renderMuteButton = (
  hass: HomeAssistant,
  stateObj: MediaPlayerEntity,
  showMuteButton: boolean | undefined,
  disabled: boolean,
  onToggleMute: (ev: Event) => void
): TemplateResult | typeof nothing => {
  if (
    !(showMuteButton ?? true) ||
    !supportsFeature(stateObj, MediaPlayerEntityFeature.VOLUME_MUTE)
  ) {
    return nothing;
  }
  const isMuted = stateObj.attributes.is_volume_muted;
  return html`
    <ha-control-button
      class="mute"
      .label=${hass.localize(
        `ui.card.media_player.${isMuted ? "media_volume_unmute" : "media_volume_mute"}`
      )}
      .disabled=${disabled}
      @click=${onToggleMute}
    >
      <ha-svg-icon
        .path=${isMuted ? mdiVolumeOff : mdiVolumeHigh}
      ></ha-svg-icon>
    </ha-control-button>
  `;
};

export const toggleMediaPlayerMute = (
  ev: Event,
  hass: HomeAssistant,
  stateObj: MediaPlayerEntity,
  el: HTMLElement
): void => {
  ev.stopPropagation();
  forwardHaptic(el, "light");
  hass.callService("media_player", "volume_mute", {
    entity_id: stateObj.entity_id,
    is_volume_muted: !stateObj.attributes.is_volume_muted,
  });
};
