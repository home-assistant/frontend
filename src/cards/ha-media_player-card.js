import classnames from 'classnames';

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
    if (!playerObj.isOff && !playerObj.isIdle) {
      this.$.cover.style.backgroundImage = playerObj.stateObj.attributes.entity_picture ?
        `url(${playerObj.stateObj.attributes.entity_picture})` : '';
    }
  },

  computeBannerClasses(playerObj) {
    return classnames({
      banner: true,
      'is-off': playerObj.isOff || playerObj.isIdle,
    });
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
    } else if (playerObj.isPaused || playerObj.isOff) {
      return 'mdi:play';
    }
    return '';
  },

  computeShowControls(playerObj) {
    return !playerObj.isOff;
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

  handleTogglePower(ev) {
    ev.stopPropagation();
    this.playerObj.togglePower();
  },
});
