import { HassEntity } from "home-assistant-js-websocket";
import { MediaEntity } from "../types";
import { computeStateName } from "../common/entity/compute_state_name";
import { UNAVAILABLE, UNKNOWN } from "./entity";
import { supportsFeature } from "../common/entity/supports-feature";
import { stateIcon } from "../common/entity/state_icon";

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
    this._stateObjectArray.push({ ...stateObj, timestamp: Date.now() });
    if (this._updateCallback) {
      this._updateCallback();
    }
  }

  public set updateCallback(callback: () => void) {
    this._updateCallback = callback;
  }

  public get state() {
    return this._mostRecentState.state;
  }

  public get entityName() {
    return computeStateName(this._mostRecentState);
  }

  public get title() {
    return this._mostRecentState.attributes.media_title;
  }

  public get isOff(): boolean {
    return this._mostRecentState.state === "off";
  }

  public get isUnavailable(): boolean {
    return (
      this._mostRecentState.state === UNAVAILABLE ||
      this._mostRecentState.state === UNKNOWN ||
      (this.isOff && !supportsFeature(this._mostRecentState, SUPPORT_TURN_ON))
    );
  }

  public get description(): string {
    return computeMediaDescription(this._mostRecentState);
  }

  public get stateIcon(): string {
    return stateIcon(this._mostRecentState);
  }

  public get duration(): number {
    return this._mostRecentState.attributes.media_duration;
  }

  public supportsFeature(feature: number): boolean {
    return supportsFeature(this._mostRecentState, feature);
  }

  public get showProgressBar(): boolean {
    return (
      (this.state === "playing" || this.state === "paused") &&
      "media_duration" in this._mostRecentState.attributes &&
      "media_position" in this._mostRecentState.attributes
    );
  }

  public get image(): string | undefined {
    return (
      this._mostRecentState.attributes.entity_picture_local ||
      this._mostRecentState.attributes.entity_picture
    );
  }

  public get hasStates(): boolean {
    return this._stateObjectArray.length !== 0;
  }

  private get _mostRecentState(): MediaEntity {
    return this._stateObjectArray[this._stateObjectArray.length - 1];
  }

  private get _oldestState(): MediaEntity {
    return this._stateObjectArray[0];
  }
}
