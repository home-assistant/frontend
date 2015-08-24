import { util } from '../util/home-assistant-js-instance';

import formatTime from '../util/format-time';

const { parseDateTime } = util;

export default new Polymer({
  is: 'more-info-sun',

  properties: {
    stateObj: {
      type: Object,
    },

    risingDate: {
      type: Object,
      computed: 'computeRising(stateObj)',
    },

    settingDate: {
      type: Object,
      computed: 'computeSetting(stateObj)',
    },
  },

  computeRising(stateObj) {
    return parseDateTime(stateObj.attributes.next_rising);
  },

  computeSetting(stateObj) {
    return parseDateTime(stateObj.attributes.next_setting);
  },

  computeOrder(risingDate, settingDate) {
    return risingDate > settingDate ?  ['set', 'ris'] : ['ris', 'set'];
  },

  itemCaption(type) {
    return type === 'ris' ? 'Rising ' : 'Setting ';
  },

  itemDate(type) {
    return type === 'ris' ? this.risingDate : this.settingDate;
  },

  itemValue(type) {
    return formatTime(this.itemDate(type));
  },
});
