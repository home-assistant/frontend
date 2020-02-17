import { HomeAssistant } from "../types";

import { timeCachePromiseFunc } from "../common/util/time-cache-function-promise";

export const SUPPORT_PAUSE = 1;
export const SUPPORT_VOLUME_SET = 4;
export const SUPPORT_VOLUME_MUTE = 8;
export const SUPPORT_PREVIOUS_TRACK = 16;
export const SUPPORT_NEXT_TRACK = 32;
export const SUPPORT_TURN_ON = 128;
export const SUPPORT_TURN_OFF = 256;
export const SUPPORT_PLAY_MEDIA = 512;
export const SUPPORT_VOLUME_BUTTONS = 1024;
export const SUPPORT_SELECT_SOURCE = 2048;
export const SUPPORT_STOP = 4096;
export const SUPPORTS_PLAY = 16384;
export const SUPPORT_SELECT_SOUND_MODE = 65536;
export const OFF_STATES = ["off", "idle"];

export interface MediaPlayerThumbnail {
  content_type: string;
  content: string;
}

export const fetchMediaPlayerThumbnailWithCache = (
  hass: HomeAssistant,
  entityId: string
) =>
  timeCachePromiseFunc(
    "_media_playerTmb",
    9000,
    fetchMediaPlayerThumbnail,
    hass,
    entityId
  );

export const fetchMediaPlayerThumbnail = (
  hass: HomeAssistant,
  entityId: string
) => {
  return hass.callWS<MediaPlayerThumbnail>({
    type: "media_player_thumbnail",
    entity_id: entityId,
  });
};
