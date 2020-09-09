import type { HassEntity } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../types";
import {
  mdiFile,
  mdiFolder,
  mdiPlaylistMusic,
  mdiFileMusic,
  mdiAlbum,
  mdiMusic,
  mdiTelevisionClassic,
  mdiMovie,
  mdiVideo,
  mdiImage,
  mdiWeb,
  mdiGamepadVariant,
  mdiAccountMusic,
  mdiPodcast,
} from "@mdi/js";

export const SUPPORT_PAUSE = 1;
export const SUPPORT_SEEK = 2;
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
export const SUPPORT_BROWSE_MEDIA = 131072;
export const CONTRAST_RATIO = 4.5;

export type MediaPlayerBrowseAction = "pick" | "play";

export const BROWSER_SOURCE = "browser";

export type MediaTypeBrowserSetting = {
  icon?: string;
  thumbnail_ratio?: string;
  layout?: string;
};

export const MediaTypeBrowserSettings: {
  [type: string]: MediaTypeBrowserSetting;
} = {
  album: { icon: mdiAlbum },
  app: { icon: mdiFolder },
  apps: { icon: mdiFolder },
  artist: { icon: mdiAccountMusic },
  channel: { icon: mdiFolder, thumbnail_ratio: "portrait", layout: "grid" },
  channels: { icon: mdiFolder, thumbnail_ratio: "portrait" },
  composer: { icon: mdiFolder },
  contributing_artist: { icon: mdiFolder },
  directory: { icon: mdiFolder },
  episode: { icon: mdiFolder, thumbnail_ratio: "portrait" },
  game: { icon: mdiGamepadVariant, thumbnail_ratio: "portrait" },
  genre: { icon: mdiFolder },
  image: { icon: mdiImage },
  movie: { icon: mdiMovie, thumbnail_ratio: "portrait", layout: "grid" },
  music: { icon: mdiMusic },
  playlist: { icon: mdiPlaylistMusic },
  podcast: { icon: mdiPodcast },
  season: { icon: mdiFolder, thumbnail_ratio: "portrait" },
  track: { icon: mdiFileMusic },
  tv_show: { icon: mdiTelevisionClassic, thumbnail_ratio: "portrait" },
  url: { icon: mdiWeb },
  video: { icon: mdiVideo },
};

export interface MediaPickedEvent {
  item: MediaPlayerItem;
}

export interface MediaPlayerThumbnail {
  content_type: string;
  content: string;
}

export interface ControlButton {
  icon: string;
  action: string;
}

export interface MediaPlayerItem {
  title: string;
  media_content_type: string;
  media_content_id: string;
  can_play: boolean;
  can_expand: boolean;
  thumbnail?: string;
  children?: MediaPlayerItem[];
}

export const browseMediaPlayer = (
  hass: HomeAssistant,
  entityId: string,
  mediaContentId?: string,
  mediaContentType?: string
): Promise<MediaPlayerItem> =>
  hass.callWS<MediaPlayerItem>({
    type: "media_player/browse_media",
    entity_id: entityId,
    media_content_id: mediaContentId,
    media_content_type: mediaContentType,
  });

export const browseLocalMediaPlayer = (
  hass: HomeAssistant,
  mediaContentId?: string
): Promise<MediaPlayerItem> =>
  hass.callWS<MediaPlayerItem>({
    type: "media_source/browse_media",
    media_content_id: mediaContentId,
  });

export const getCurrentProgress = (stateObj: HassEntity): number => {
  let progress = stateObj.attributes.media_position;

  if (stateObj.state !== "playing") {
    return progress;
  }
  progress +=
    (Date.now() -
      new Date(stateObj.attributes.media_position_updated_at).getTime()) /
    1000.0;
  return progress;
};

export const computeMediaDescription = (stateObj: HassEntity): string => {
  let secondaryTitle: string;

  switch (stateObj.attributes.media_content_type) {
    case "music":
      secondaryTitle = stateObj.attributes.media_artist;
      break;
    case "playlist":
      secondaryTitle = stateObj.attributes.media_playlist;
      break;
    case "tvshow":
      secondaryTitle = stateObj.attributes.media_series_title;
      if (stateObj.attributes.media_season) {
        secondaryTitle += " S" + stateObj.attributes.media_season;

        if (stateObj.attributes.media_episode) {
          secondaryTitle += "E" + stateObj.attributes.media_episode;
        }
      }
      break;
    default:
      secondaryTitle = stateObj.attributes.app_name || "";
  }

  return secondaryTitle;
};
