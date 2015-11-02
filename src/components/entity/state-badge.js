import Polymer from '../../polymer';

import xyBriToRgb from '../../util/xybri-to-rgb';

require('./ha-state-icon');

export default new Polymer({
  is: 'state-badge',

  properties: {
    stateObj: {
      type: Object,
      observer: 'updateIconColor',
    },
  },

  /**
   * Called when an attribute changes that influences the color of the icon.
   */
  updateIconColor(newVal) {
    // for domain light, set color of icon to light color if available
    if (newVal.domain === 'light' && newVal.state === 'on' &&
       newVal.attributes.brightness && newVal.attributes.xy_color) {
      const rgb = xyBriToRgb(newVal.attributes.xy_color[0],
                             newVal.attributes.xy_color[1],
                             newVal.attributes.brightness);
      this.$.icon.style.color = 'rgb(' + rgb.map(Math.floor).join(',') + ')';
    } else {
      this.$.icon.style.color = null;
    }
  },

});
