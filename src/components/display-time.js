import Polymer from '../polymer';

import formatTime from '../util/format-time';

export default new Polymer({
  is: 'display-time',

  properties: {
    dateObj: {
      type: Object,
    },
  },

  computeTime(dateObj) {
    return dateObj ? formatTime(dateObj) : '';
  },
});
