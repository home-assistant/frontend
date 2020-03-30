import { HassEntity } from "home-assistant-js-websocket";
import { MediaEntity } from "../types";
import { computeStateName } from "../common/entity/compute_state_name";

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
export const CONTRAST_RATIO = 4.5;

export interface MediaPlayerThumbnail {
  content_type: string;
  content: string;
}

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

interface MediaState extends MediaEntity {
  timestamp: number;
}

export class MediaStateController {
  private _stateObjectArray: MediaState[] = [];
  private _updateCallback?: () => void;

  constructor() {}

  public addState(stateObj: MediaEntity): void {
    if (!this._stateObjectArray.length) {
      this._stateObjectArray.push({ ...stateObj, timestamp: Date.now() });
    }
  }

  public set updateCallback(callback: () => void) {
    this._updateCallback = callback;
  }

  public get entityName() {
    return computeStateName(this._mostRecentState);
  }

  public get mediaTitle() {
    return (
      this._mostRecentState.attributes.media_title ||
      computeMediaDescription(this._mostRecentState)
    );
  }

  private get _mostRecentState(): MediaEntity {
    return this._stateObjectArray[this._stateObjectArray.length - 1];
  }

  private get _oldestState(): MediaEntity {
    return this._stateObjectArray[this._stateObjectArray.length - 1];
  }
}
