import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import attributeClassNames from '../util/attribute-class-names';

const { serviceActions } = hass;
const ATTRIBUTE_CLASSES = ['volume_level'];

export default new Polymer({
  is: 'more-info-media_player',

  properties: {
    stateObj: {
      type: Object,
      observer: 'stateObjChanged',
    },

    isOff: {
      type: Boolean,
      value: false,
    },

    isPlaying: {
      type: Boolean,
      value: false,
    },

    isMuted: {
      type: Boolean,
      value: false,
    },

    volumeSliderValue: {
      type: Number,
      value: 0,
    },

    supportsPause: {
      type: Boolean,
      value: false,
    },

    supportsVolumeSet: {
      type: Boolean,
      value: false,
    },

    supportsVolumeMute: {
      type: Boolean,
      value: false,
    },

    supportsPreviousTrack: {
      type: Boolean,
      value: false,
    },

    supportsNextTrack: {
      type: Boolean,
      value: false,
    },

    supportsTurnOn: {
      type: Boolean,
      value: false,
    },

    supportsTurnOff: {
      type: Boolean,
      value: false,
    },

  },

  stateObjChanged(newVal) {
    if (newVal) {
      this.isOff = newVal.state === 'off';
      this.isPlaying = newVal.state === 'playing';
      this.volumeSliderValue = newVal.attributes.volume_level * 100;
      this.isMuted = newVal.attributes.is_volume_muted;
      this.supportsPause = (newVal.attributes.supported_media_commands & 1) !== 0;
      this.supportsVolumeSet = (newVal.attributes.supported_media_commands & 4) !== 0;
      this.supportsVolumeMute = (newVal.attributes.supported_media_commands & 8) !== 0;
      this.supportsPreviousTrack = (newVal.attributes.supported_media_commands & 16) !== 0;
      this.supportsNextTrack = (newVal.attributes.supported_media_commands & 32) !== 0;
      this.supportsTurnOn = (newVal.attributes.supported_media_commands & 128) !== 0;
      this.supportsTurnOff = (newVal.attributes.supported_media_commands & 256) !== 0;
    }

    this.async(() => this.fire('iron-resize'), 500);
  },

  computeClassNames(stateObj) {
    return attributeClassNames(stateObj, ATTRIBUTE_CLASSES);
  },

  computeIsOff(stateObj) {
    return stateObj.state === 'off';
  },

  computeMuteVolumeIcon(isMuted) {
    return isMuted ? 'mdi:volume-off' : 'mdi:volume-high';
  },

  computePlaybackControlIcon() {
    if (this.isPlaying) {
      return this.supportsPause ? 'mdi:pause' : 'mdi:stop';
    }
    return 'mdi:play';
  },

  computeHidePowerButton(isOff, supportsTurnOn, supportsTurnOff) {
    return isOff ? !supportsTurnOn : !supportsTurnOff;
  },

  handleTogglePower() {
    this.callService(this.isOff ? 'turn_on' : 'turn_off');
  },

  handlePrevious() {
    this.callService('media_previous_track');
  },

  handlePlaybackControl() {
    this.callService('media_play_pause');
  },

  handleNext() {
    this.callService('media_next_track');
  },

  handleVolumeTap() {
    if (!this.supportsVolumeMute) {
      return;
    }
    this.callService('volume_mute', { is_volume_muted: !this.isMuted });
  },

  volumeSliderChanged(ev) {
    const volPercentage = parseFloat(ev.target.value);
    const vol = volPercentage > 0 ? volPercentage / 100 : 0;
    this.callService('volume_set', { volume_level: vol });
  },

  callService(service, data) {
    const serviceData = data || {};
    serviceData.entity_id = this.stateObj.entityId;
    serviceActions.callService('media_player', service, serviceData);
  },
});
