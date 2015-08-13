import { util } from 'home-assistant-js';

import formatTime from '../util/format-time';

const { parseDateTime } = util;

export default new Polymer({
  is: 'more-info-sun',

  properties: {
    stateObj: {
      type: Object,
      observer: 'stateObjChanged',
    },

    risingDate: {
      type: Object,
    },

    settingDate: {
      type: Object,
    },

    risingTime: {
      type: String,
    },

    settingTime: {
      type: String,
    },
  },

  stateObjChanged() {
    this.risingDate = parseDateTime(this.stateObj.attributes.next_rising);
    this.risingTime = formatTime(this.risingDate);

    this.settingDate = parseDateTime(this.stateObj.attributes.next_setting);
    this.settingTime = formatTime(this.settingDate);

    const root = Polymer.dom(this);

    if (self.risingDate > self.settingDate) {
      root.appendChild(this.$.rising);
    } else {
      root.appendChild(this.$.setting);
    }
  },
});
