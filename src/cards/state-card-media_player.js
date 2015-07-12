import Polymer from '../polymer';

require('../components/state-info');

const PLAYING_STATES = ['playing', 'paused'];

export default Polymer({
  is: 'state-card-media_player',

  properties: {
    stateObj: {
      type: Object,
    },

    isPlaying: {
      type: Boolean,
      computed: 'computeIsPlaying(stateObj)',
    },
  },

  computeIsPlaying: function(stateObj) {
    return PLAYING_STATES.indexOf(stateObj.state) !== -1;
  },

  computePrimaryText: function(stateObj, isPlaying) {
    return isPlaying ? stateObj.attributes.media_title : stateObj.stateDisplay;
  },

  computeSecondaryText: function(stateObj, isPlaying) {
    var text;

    if (stateObj.attributes.media_content_type == 'music') {
      return stateObj.attributes.media_artist;

    } else if (stateObj.attributes.media_content_type == 'tvshow') {
      text = stateObj.attributes.media_series_title;

      if (stateObj.attributes.media_season && stateObj.attributes.media_episode) {
        text += ` S${stateObj.attributes.media_season}E${stateObj.attributes.media_episode}`;
      }
      return text;

    } else if (stateObj.attributes.app_name) {
      return stateObj.attributes.app_name;

    } else {
      return '';
    }
  },
});
