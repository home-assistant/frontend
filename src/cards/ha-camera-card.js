import Polymer from '../polymer';
import hass from '../util/home-assistant-js-instance';

const { moreInfoActions } = hass;

const UPDATE_INTERVAL = 10000; // ms

export default new Polymer({
  is: 'ha-camera-card',

  properties: {
    stateObj: {
      type: Object,
      observer: 'updateCameraFeedSrc',
    },

    cameraFeedSrc: {
      type: String,
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

  listeners: {
    tap: 'cardTapped',
  },

  attached() {
    this.timer = setInterval(() => this.updateCameraFeedSrc(this.stateObj),
                             UPDATE_INTERVAL);
  },

  detached() {
    clearInterval(this.timer);
  },

  cardTapped() {
    this.async(() => moreInfoActions.selectEntity(this.stateObj.entityId), 1);
  },

  updateCameraFeedSrc(stateObj) {
    const time = (new Date()).getTime();
    this.cameraFeedSrc = `${stateObj.attributes.entity_picture}?time=${time}`;
  },
});
