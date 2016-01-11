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

    supportsVolumeButtons: {
      type: Boolean,
      value: false,
    },

  },

  attached() {
    // This is required to bind a mousedown event in all browsers
    let _this = this;
    window.test = this.$.volumeUp;
    this.$.volumeUp.onmousedown = function onVolumeUpDown() {_this.handleVolumeUp();};
    this.$.volumeUp.ontouchstart = function onVolumeUpDown() {_this.handleVolumeUp();};
    this.$.volumeDown.onmousedown = function onVolumeDownDown() {_this.handleVolumeDown();};
    this.$.volumeDown.ontouchstart = function onVolumeDownDown() {_this.handleVolumeDown();};
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
      this.supportsVolumeButtons = (newVal.attributes.supported_media_commands & 1024) !== 0;
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

  computeHideVolumeButtons(isOff, supportsVolumeButtons) {
    return !supportsVolumeButtons || isOff;
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

  handleVolumeUp() {
    let obj = this.$.volumeUp;
    this.handleVolumeWorker('volume_up', obj, true);
  },

  handleVolumeDown() {
    let obj = this.$.volumeDown;
    this.handleVolumeWorker('volume_down', obj, true);
  },

  handleVolumeWorker(service, obj, force) {
    if (force || (obj !== undefined && obj.pointerDown)) {
      this.callService(service);
      let _this = this;
      setTimeout(function callback() {_this.handleVolumeWorker(service, obj, false);}, 500);
    }
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
