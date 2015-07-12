import Polymer from '../polymer';

import formatTime from '../util/format-time';

export default Polymer({
  is: 'display-time',

  properties: {
    dateObj: {
      type: Object,
    },
  },

  computeTime: function(dateObj) {
    return dateObj ? formatTime(dateObj) : '';
  },
});
