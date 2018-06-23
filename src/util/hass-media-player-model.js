export default class MediaPlayerEntity {
  constructor(hass, stateObj) {
    this.hass = hass;
    this.stateObj = stateObj;
    this._attr = stateObj.attributes;
    this._feat = this._attr.supported_features;
  }

  get isOff() {
    return this.stateObj.state === 'off';
  }

  get isIdle() {
    return this.stateObj.state === 'idle';
  }

  get isMuted() {
    return this._attr.is_volume_muted;
  }

  get isPaused() {
    return this.stateObj.state === 'paused';
  }

  get isPlaying() {
    return this.stateObj.state === 'playing';
  }

  get isMusic() {
    return this._attr.media_content_type === 'music';
  }

  get isTVShow() {
    return this._attr.media_content_type === 'tvshow';
  }

  get hasMediaControl() {
    return ['playing', 'paused', 'unknown'].indexOf(this.stateObj.state) !== -1;
  }

  get volumeSliderValue() {
    return this._attr.volume_level * 100;
  }

  get showProgress() {
    return (
      (this.isPlaying || this.isPaused) &&
      'media_duration' in this.stateObj.attributes &&
      'media_position' in this.stateObj.attributes &&
      'media_position_updated_at' in this.stateObj.attributes);
  }

  get currentProgress() {
    var progress = this._attr.media_position;
    if (this.isPlaying) {
      progress += (Date.now() -
                  new Date(this._attr.media_position_updated_at).getTime()) / 1000.0;
    }
    return progress;
  }

  /* eslint-disable no-bitwise */

  get supportsPause() {
    return (this._feat & 1) !== 0;
  }

  get supportsVolumeSet() {
    return (this._feat & 4) !== 0;
  }

  get supportsVolumeMute() {
    return (this._feat & 8) !== 0;
  }

  get supportsPreviousTrack() {
    return (this._feat & 16) !== 0;
  }

  get supportsNextTrack() {
    return (this._feat & 32) !== 0;
  }

  get supportsTurnOn() {
    return (this._feat & 128) !== 0;
  }

  get supportsTurnOff() {
    return (this._feat & 256) !== 0;
  }

  get supportsPlayMedia() {
    return (this._feat & 512) !== 0;
  }

  get supportsVolumeButtons() {
    return (this._feat & 1024) !== 0;
  }

  get supportsSelectSource() {
    return (this._feat & 2048) !== 0;
  }

  get supportsSelectSoundMode() {
    return (this._feat & 65536) !== 0;
  }

  get supportsPlay() {
    return (this._feat & 16384) !== 0;
  }

  /* eslint-enable no-bitwise */

  get primaryTitle() {
    return this._attr.media_title;
  }

  get secondaryTitle() {
    if (this.isMusic) {
      return this._attr.media_artist;
    } else if (this.isTVShow) {
      var text = this._attr.media_series_title;

      if (this._attr.media_season) {
        text += ' S' + this._attr.media_season;

        if (this._attr.media_episode) {
          text += 'E' + this._attr.media_episode;
        }
      }

      return text;
    } else if (this._attr.app_name) {
      return this._attr.app_name;
    }
    return '';
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
    this.callService('media_play_pause');
  }

  nextTrack() {
    this.callService('media_next_track');
  }

  playbackControl() {
    this.callService('media_play_pause');
  }

  previousTrack() {
    this.callService('media_previous_track');
  }

  setVolume(volume) {
    this.callService('volume_set', { volume_level: volume });
  }

  togglePower() {
    if (this.isOff) {
      this.turnOn();
    } else {
      this.turnOff();
    }
  }

  turnOff() {
    this.callService('turn_off');
  }

  turnOn() {
    this.callService('turn_on');
  }

  volumeDown() {
    this.callService('volume_down');
  }

  volumeMute(mute) {
    if (!this.supportsVolumeMute) {
      throw new Error('Muting volume not supported');
    }
    this.callService('volume_mute', { is_volume_muted: mute });
  }

  volumeUp() {
    this.callService('volume_up');
  }

  selectSource(source) {
    this.callService('select_source', { source });
  }

  selectSoundMode(soundMode) {
    this.callService('select_sound_mode', { sound_mode: soundMode });
  }

  // helper method

  callService(service, data = {}) {
    data.entity_id = this.stateObj.entity_id;
    this.hass.callService('media_player', service, data);
  }
}
