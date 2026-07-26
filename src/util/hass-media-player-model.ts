import type { HassEntity } from "home-assistant-js-websocket";
import { supportsFeature } from "../common/entity/supports-feature";
import {
  cleanupMediaTitle,
  MediaPlayerEntityFeature,
} from "../data/media-player";
import type { HomeAssistant } from "../types";

export default class MediaPlayerEntity {
  public hass: Pick<HomeAssistant, "callService">;

  public stateObj: HassEntity;

  private _attr: Record<string, any>;

  constructor(hass: Pick<HomeAssistant, "callService">, stateObj: HassEntity) {
    this.hass = hass;
    this.stateObj = stateObj;
    this._attr = stateObj.attributes;
  }

  get isOff() {
    return this.stateObj.state === "off";
  }

  get isIdle() {
    return this.stateObj.state === "idle";
  }

  get isMuted() {
    return this._attr.is_volume_muted;
  }

  get isPaused() {
    return this.stateObj.state === "paused";
  }

  get isPlaying() {
    return this.stateObj.state === "playing";
  }

  get isMusic() {
    return this._attr.media_content_type === "music";
  }

  get isTVShow() {
    return this._attr.media_content_type === "tvshow";
  }

  get hasMediaControl() {
    return (
      ["playing", "paused", "unknown", "on"].indexOf(this.stateObj.state) !== -1
    );
  }

  get volumeSliderValue() {
    return this._attr.volume_level * 100;
  }

  get showProgress() {
    return (
      (this.isPlaying || this.isPaused) &&
      "media_duration" in this.stateObj.attributes &&
      "media_position" in this.stateObj.attributes &&
      "media_position_updated_at" in this.stateObj.attributes
    );
  }

  get currentProgress() {
    let progress = this._attr.media_position;
    if (this.isPlaying) {
      progress +=
        (Date.now() -
          new Date(this._attr.media_position_updated_at).getTime()) /
        1000.0;
    }
    return progress;
  }

  get supportsPause() {
    return supportsFeature(this.stateObj, MediaPlayerEntityFeature.PAUSE);
  }

  get supportsVolumeSet() {
    return supportsFeature(this.stateObj, MediaPlayerEntityFeature.VOLUME_SET);
  }

  get supportsVolumeMute() {
    return supportsFeature(this.stateObj, MediaPlayerEntityFeature.VOLUME_MUTE);
  }

  get supportsPreviousTrack() {
    return supportsFeature(
      this.stateObj,
      MediaPlayerEntityFeature.PREVIOUS_TRACK
    );
  }

  get supportsNextTrack() {
    return supportsFeature(this.stateObj, MediaPlayerEntityFeature.NEXT_TRACK);
  }

  get supportsTurnOn() {
    return supportsFeature(this.stateObj, MediaPlayerEntityFeature.TURN_ON);
  }

  get supportsTurnOff() {
    return supportsFeature(this.stateObj, MediaPlayerEntityFeature.TURN_OFF);
  }

  get supportsPlayMedia() {
    return supportsFeature(this.stateObj, MediaPlayerEntityFeature.PLAY_MEDIA);
  }

  get supportsVolumeButtons() {
    return supportsFeature(this.stateObj, MediaPlayerEntityFeature.VOLUME_STEP);
  }

  get supportsSelectSource() {
    return supportsFeature(
      this.stateObj,
      MediaPlayerEntityFeature.SELECT_SOURCE
    );
  }

  get supportsSelectSoundMode() {
    return supportsFeature(
      this.stateObj,
      MediaPlayerEntityFeature.SELECT_SOUND_MODE
    );
  }

  get supportsPlay() {
    return supportsFeature(this.stateObj, MediaPlayerEntityFeature.PLAY);
  }

  get primaryTitle() {
    return cleanupMediaTitle(this._attr.media_title);
  }

  get secondaryTitle() {
    if (this.isMusic) {
      return this._attr.media_artist;
    }
    if (this.isTVShow) {
      let text = this._attr.media_series_title;

      if (this._attr.media_season) {
        text += " S" + this._attr.media_season;

        if (this._attr.media_episode) {
          text += "E" + this._attr.media_episode;
        }
      }

      return text;
    }
    if (this._attr.app_name) {
      return this._attr.app_name;
    }
    return "";
  }

  get source() {
    return this._attr.source;
  }

  get sourceList() {
    return this._attr.source_list;
  }

  get soundMode() {
    return this._attr.sound_mode;
  }

  get soundModeList() {
    return this._attr.sound_mode_list;
  }

  mediaPlayPause() {
    this.callService("media_play_pause");
  }

  nextTrack() {
    this.callService("media_next_track");
  }

  playbackControl() {
    this.callService("media_play_pause");
  }

  previousTrack() {
    this.callService("media_previous_track");
  }

  setVolume(volume) {
    this.callService("volume_set", { volume_level: volume });
  }

  togglePower() {
    if (this.isOff) {
      this.turnOn();
    } else {
      this.turnOff();
    }
  }

  turnOff() {
    this.callService("turn_off");
  }

  turnOn() {
    this.callService("turn_on");
  }

  volumeDown() {
    this.callService("volume_down");
  }

  volumeMute(mute) {
    if (!this.supportsVolumeMute) {
      throw new Error("Muting volume not supported");
    }
    this.callService("volume_mute", { is_volume_muted: mute });
  }

  volumeUp() {
    this.callService("volume_up");
  }

  selectSource(source) {
    this.callService("select_source", { source });
  }

  selectSoundMode(soundMode) {
    this.callService("select_sound_mode", { sound_mode: soundMode });
  }

  // helper method

  callService(service, data: any = {}) {
    data.entity_id = this.stateObj.entity_id;
    this.hass.callService("media_player", service, data);
  }
}
