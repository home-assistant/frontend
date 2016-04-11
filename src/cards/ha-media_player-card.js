import Polymer from '../polymer';
import hass from '../util/home-assistant-js-instance';

const { moreInfoActions, serviceActions } = hass;

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

    selectedSource: {
      type: String,
      observer: 'selectedSourceChanged',
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
    this.style.height = '78px';
    if (this.computeShowControls(playerObj)) {
        this.style.height = playerObj.supportsSelectInputSource ? '232px' : '175px';
    }

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
    return playerObj.isMuted ? 'mdi:volume-off' : 'mdi:volume-high';
  },

  computeSelectedSource(stateObj) {
    return stateObj.attributes.source_list.indexOf(stateObj.attributes.source);
  },

  selectedSourceChanged(option) {
    // Selected Option will transition to '' before transitioning to new value
    if (option === '' || option === this.stateObj.attributes.source) {
      return;
    }
    this.playerObj.input(option);
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

  stopPropagation(ev) {
    ev.stopPropagation();
  },

});
