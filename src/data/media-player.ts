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
  mdiPause,
  mdiPlay,
  mdiPlaylistMusic,
  mdiPlayPause,
  mdiPodcast,
  mdiPower,
  mdiRepeat,
  mdiRepeatOff,
  mdiRepeatOnce,
  mdiShuffle,
  mdiShuffleDisabled,
  mdiSkipNext,
  mdiSkipPrevious,
  mdiStop,
  mdiTelevisionClassic,
  mdiVideo,
  mdiWeb,
} from "@mdi/js";
import type {
  HassEntityAttributeBase,
  HassEntityBase,
} from "home-assistant-js-websocket";
import { supportsFeature } from "../common/entity/supports-feature";
import { MediaPlayerItemId } from "../components/media-player/ha-media-player-browse";
import type { HomeAssistant, TranslationDict } from "../types";
import { UNAVAILABLE_STATES } from "./entity";
import { isTTSMediaSource } from "./tts";

interface MediaPlayerEntityAttributes extends HassEntityAttributeBase {
  media_content_id?: string;
  media_content_type?: string;
  media_artist?: string;
  media_playlist?: string;
  media_series_title?: string;
  media_season?: any;
  media_episode?: any;
  app_name?: string;
  media_position_updated_at?: string | number | Date;
  media_duration?: number;
  media_position?: number;
  media_title?: string;
  media_channel?: string;
  icon?: string;
  entity_picture_local?: string;
  is_volume_muted?: boolean;
  volume_level?: number;
  repeat?: string;
  shuffle?: boolean;
  source?: string;
  source_list?: string[];
  sound_mode?: string;
  sound_mode_list?: string[];
}

export interface MediaPlayerEntity extends HassEntityBase {
  attributes: MediaPlayerEntityAttributes;
  state:
    | "playing"
    | "paused"
    | "idle"
    | "off"
    | "on"
    | "unavailable"
    | "unknown";
}

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
export const SUPPORT_PLAY = 16384;
export const SUPPORT_REPEAT_SET = 262144;
export const SUPPORT_SELECT_SOUND_MODE = 65536;
export const SUPPORT_SHUFFLE_SET = 32768;
export const SUPPORT_BROWSE_MEDIA = 131072;

export type MediaPlayerBrowseAction = "pick" | "play";

export const BROWSER_PLAYER = "browser";

export type MediaClassBrowserSetting = {
  icon: string;
  thumbnail_ratio?: string;
  layout?: "grid";
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
  navigateIds: MediaPlayerItemId[];
}

export interface MediaPlayerThumbnail {
  content_type: string;
  content: string;
}

export interface ControlButton {
  icon: string;
  // Used as key for action as well as tooltip and aria-label translation key
  action: keyof TranslationDict["ui"]["card"]["media_player"];
}

export interface MediaPlayerItem {
  title: string;
  media_content_type: string;
  media_content_id: string;
  media_class: keyof TranslationDict["ui"]["components"]["media-browser"]["class"];
  children_media_class?: string;
  can_play: boolean;
  can_expand: boolean;
  thumbnail?: string;
  children?: MediaPlayerItem[];
  not_shown?: number;
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

export const getCurrentProgress = (stateObj: MediaPlayerEntity): number => {
  let progress = stateObj.attributes.media_position!;

  if (stateObj.state !== "playing") {
    return progress;
  }
  progress +=
    (Date.now() -
      new Date(stateObj.attributes.media_position_updated_at!).getTime()) /
    1000.0;
  return progress;
};

export const computeMediaDescription = (
  stateObj: MediaPlayerEntity
): string => {
  let secondaryTitle: string;

  switch (stateObj.attributes.media_content_type) {
    case "music":
    case "image":
      secondaryTitle = stateObj.attributes.media_artist!;
      break;
    case "playlist":
      secondaryTitle = stateObj.attributes.media_playlist!;
      break;
    case "tvshow":
      secondaryTitle = stateObj.attributes.media_series_title!;
      if (stateObj.attributes.media_season) {
        secondaryTitle += " S" + stateObj.attributes.media_season;

        if (stateObj.attributes.media_episode) {
          secondaryTitle += "E" + stateObj.attributes.media_episode;
        }
      }
      break;
    case "channel":
      secondaryTitle = stateObj.attributes.media_channel!;
      break;
    default:
      secondaryTitle = stateObj.attributes.app_name || "";
  }

  return secondaryTitle;
};

export const computeMediaControls = (
  stateObj: MediaPlayerEntity,
  useExtendedControls = false
): ControlButton[] | undefined => {
  if (!stateObj) {
    return undefined;
  }

  const state = stateObj.state;

  if (UNAVAILABLE_STATES.includes(state)) {
    return undefined;
  }

  if (state === "off") {
    return supportsFeature(stateObj, SUPPORT_TURN_ON)
      ? [
          {
            icon: mdiPower,
            action: "turn_on",
          },
        ]
      : undefined;
  }

  const buttons: ControlButton[] = [];

  if (supportsFeature(stateObj, SUPPORT_TURN_OFF)) {
    buttons.push({
      icon: mdiPower,
      action: "turn_off",
    });
  }

  const assumedState = stateObj.attributes.assumed_state === true;
  const stateAttr = stateObj.attributes;

  if (
    (state === "playing" || state === "paused" || assumedState) &&
    supportsFeature(stateObj, SUPPORT_SHUFFLE_SET) &&
    useExtendedControls
  ) {
    buttons.push({
      icon: stateAttr.shuffle === true ? mdiShuffle : mdiShuffleDisabled,
      action: "shuffle_set",
    });
  }

  if (
    (state === "playing" || state === "paused" || assumedState) &&
    supportsFeature(stateObj, SUPPORT_PREVIOUS_TRACK)
  ) {
    buttons.push({
      icon: mdiSkipPrevious,
      action: "media_previous_track",
    });
  }

  if (
    !assumedState &&
    ((state === "playing" &&
      (supportsFeature(stateObj, SUPPORT_PAUSE) ||
        supportsFeature(stateObj, SUPPORT_STOP))) ||
      ((state === "paused" || state === "idle") &&
        supportsFeature(stateObj, SUPPORT_PLAY)) ||
      (state === "on" &&
        (supportsFeature(stateObj, SUPPORT_PLAY) ||
          supportsFeature(stateObj, SUPPORT_PAUSE))))
  ) {
    buttons.push({
      icon:
        state === "on"
          ? mdiPlayPause
          : state !== "playing"
          ? mdiPlay
          : supportsFeature(stateObj, SUPPORT_PAUSE)
          ? mdiPause
          : mdiStop,
      action:
        state !== "playing"
          ? "media_play"
          : supportsFeature(stateObj, SUPPORT_PAUSE)
          ? "media_pause"
          : "media_stop",
    });
  }

  if (assumedState && supportsFeature(stateObj, SUPPORT_PLAY)) {
    buttons.push({
      icon: mdiPlay,
      action: "media_play",
    });
  }

  if (assumedState && supportsFeature(stateObj, SUPPORT_PAUSE)) {
    buttons.push({
      icon: mdiPause,
      action: "media_pause",
    });
  }

  if (assumedState && supportsFeature(stateObj, SUPPORT_STOP)) {
    buttons.push({
      icon: mdiStop,
      action: "media_stop",
    });
  }

  if (
    (state === "playing" || state === "paused" || assumedState) &&
    supportsFeature(stateObj, SUPPORT_NEXT_TRACK)
  ) {
    buttons.push({
      icon: mdiSkipNext,
      action: "media_next_track",
    });
  }

  if (
    (state === "playing" || state === "paused" || assumedState) &&
    supportsFeature(stateObj, SUPPORT_REPEAT_SET) &&
    useExtendedControls
  ) {
    buttons.push({
      icon:
        stateAttr.repeat === "all"
          ? mdiRepeat
          : stateAttr.repeat === "one"
          ? mdiRepeatOnce
          : mdiRepeatOff,
      action: "repeat_set",
    });
  }

  return buttons.length > 0 ? buttons : undefined;
};

export const formatMediaTime = (seconds: number | undefined): string => {
  if (seconds === undefined || seconds === Infinity) {
    return "";
  }

  let secondsString = new Date(seconds * 1000).toISOString();
  secondsString =
    seconds > 3600
      ? secondsString.substring(11, 16)
      : secondsString.substring(14, 19);
  return secondsString.replace(/^0+/, "").padStart(4, "0");
};

export const cleanupMediaTitle = (title?: string): string | undefined => {
  if (!title) {
    return undefined;
  }

  const index = title.indexOf("?authSig=");
  return index > 0 ? title.slice(0, index) : title;
};

/**
 * Set volume of a media player entity.
 * @param hass Home Assistant object
 * @param entity_id entity ID of media player
 * @param volume_level number between 0..1
 * @returns
 */
export const setMediaPlayerVolume = (
  hass: HomeAssistant,
  entity_id: string,
  volume_level: number
) =>
  hass.callService("media_player", "volume_set", { entity_id, volume_level });

export const handleMediaControlClick = (
  hass: HomeAssistant,
  stateObj: MediaPlayerEntity,
  action: string
) =>
  hass!.callService(
    "media_player",
    action,
    action === "shuffle_set"
      ? {
          entity_id: stateObj!.entity_id,
          shuffle: !stateObj!.attributes.shuffle,
        }
      : action === "repeat_set"
      ? {
          entity_id: stateObj!.entity_id,
          repeat:
            stateObj!.attributes.repeat === "all"
              ? "one"
              : stateObj!.attributes.repeat === "off"
              ? "all"
              : "off",
        }
      : {
          entity_id: stateObj!.entity_id,
        }
  );

export const mediaPlayerPlayMedia = (
  hass: HomeAssistant,
  entity_id: string,
  media_content_id: string,
  media_content_type: string,
  extra: {
    enqueue?: "play" | "next" | "add" | "replace";
    announce?: boolean;
  } = {}
) => {
  // We set text-to-speech to announce.
  if (
    !extra.enqueue &&
    extra.announce === undefined &&
    isTTSMediaSource(media_content_id)
  ) {
    extra.announce = true;
  }
  return hass.callService("media_player", "play_media", {
    entity_id,
    media_content_id,
    media_content_type,
    ...extra,
  });
};
