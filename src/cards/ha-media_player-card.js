import Polymer from '../polymer';
import hass from '../util/home-assistant-js-instance';

const { moreInfoActions } = hass;

export default new Polymer({
  is: 'ha-media_player-card',

  properties: {
    stateObj: {
      type: Object,
    },

    playerObj: {
      type: Object,
      computed: 'computePlayerObj(stateObj)',
      observer: 'playerObjChanged',
    },

    imageLoaded: {
      type: Boolean,
      value: true,
    },

    playbackControlIcon: {
      type: String,
      computed: 'computePlaybackControlIcon(playerObj)',
    },

    /**
     * The z-depth of the card, from 0-5.
     */
    elevation: {
      type: Number,
      value: 1,
      reflectToAttribute: true,
    },
  },

  playerObjChanged(playerObj) {
    this.style.height = this.computeShowControls(playerObj) ? '175px' : '78px';
    this.style.backgroundImage = playerObj.stateObj.attributes.entity_picture ?
      `url(${playerObj.stateObj.attributes.entity_picture})` : '';
  },

  imageLoadSuccess() {
    this.imageLoaded = true;
  },

  imageLoadFail() {
    this.imageLoaded = false;
  },

  computeHidePowerOnButton(playerObj) {
    return !playerObj.isOff || !playerObj.supportsTurnOn;
  },

  computePlayerObj(stateObj) {
    return stateObj.domainModel(hass);
  },

  computePlaybackControlIcon(playerObj) {
    if (playerObj.isPlaying) {
      return playerObj.supportsPause ? 'mdi:pause' : 'mdi:stop';
    } else if (playerObj.isPaused) {
      return 'mdi:play';
    }
    return '';
  },

  computeShowControls(playerObj) {
    return !playerObj.isOff;
  },

  computeVolumeMuteIcon(playerObj) {
    return playerObj.isMuted ? 'mdi:volume-high' : 'mdi:volume-off';
  },

  handleNext(ev) {
    ev.stopPropagation();
    this.playerObj.nextTrack();
  },

  handleOpenMoreInfo(ev) {
    ev.stopPropagation();
    this.async(() => moreInfoActions.selectEntity(this.stateObj.entityId), 1);
  },

  handlePlaybackControl(ev) {
    ev.stopPropagation();
    this.playerObj.mediaPlayPause();
  },

  handlePrevious(ev) {
    ev.stopPropagation();
    this.playerObj.previousTrack();
  },

  handlePowerOff(ev) {
    ev.stopPropagation();
    this.playerObj.turnOff();
  },

  handlePowerOn(ev) {
    ev.stopPropagation();
    this.playerObj.turnOn();
  },

  handleVolumeMute(ev) {
    ev.stopPropagation();
    this.playerObj.volumeMute(!this.playerObj.isMuted);
  },

});
