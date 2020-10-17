import {
  mdiAccountMusic,
  mdiAccountMusicOutline,
  mdiAlbum,
  mdiApplication,
  mdiDramaMasks,
  mdiFileMusic,
  mdiFolder,
  mdiGamepadVariant,
  mdiImage,
  mdiMovie,
  mdiMusic,
  mdiPlaylistMusic,
  mdiPodcast,
  mdiTelevisionClassic,
  mdiVideo,
  mdiWeb,
} from "@mdi/js";
import type { HassEntity } from "home-assistant-js-websocket";
import type { HomeAssistant } from "../types";

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

export const BROWSER_PLAYER = "browser";

export type MediaClassBrowserSetting = {
  icon: string;
  thumbnail_ratio?: string;
  layout?: string;
  show_list_images?: boolean;
};

export const MediaClassBrowserSettings: {
  [type: string]: MediaClassBrowserSetting;
} = {
  album: { icon: mdiAlbum, layout: "grid" },
  app: { icon: mdiApplication, layout: "grid" },
  artist: { icon: mdiAccountMusic, layout: "grid", show_list_images: true },
  channel: {
    icon: mdiTelevisionClassic,
    thumbnail_ratio: "portrait",
    layout: "grid",
  },
  composer: {
    icon: mdiAccountMusicOutline,
    layout: "grid",
    show_list_images: true,
  },
  contributing_artist: {
    icon: mdiAccountMusic,
    layout: "grid",
    show_list_images: true,
  },
  directory: { icon: mdiFolder, layout: "grid", show_list_images: true },
  episode: {
    icon: mdiTelevisionClassic,
    layout: "grid",
    thumbnail_ratio: "portrait",
  },
  game: {
    icon: mdiGamepadVariant,
    layout: "grid",
    thumbnail_ratio: "portrait",
  },
  genre: { icon: mdiDramaMasks, layout: "grid", show_list_images: true },
  image: { icon: mdiImage, layout: "grid" },
  movie: { icon: mdiMovie, thumbnail_ratio: "portrait", layout: "grid" },
  music: { icon: mdiMusic },
  playlist: { icon: mdiPlaylistMusic, layout: "grid", show_list_images: true },
  podcast: { icon: mdiPodcast, layout: "grid" },
  season: {
    icon: mdiTelevisionClassic,
    layout: "grid",
    thumbnail_ratio: "portrait",
  },
  track: { icon: mdiFileMusic },
  tv_show: {
    icon: mdiTelevisionClassic,
    layout: "grid",
    thumbnail_ratio: "portrait",
  },
  url: { icon: mdiWeb },
  video: { icon: mdiVideo, layout: "grid" },
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
  media_class: string;
  children_media_class: string;
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
