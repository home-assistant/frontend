import Polymer from '../../polymer';

require('./domain-icon');

export default new Polymer({
  is: 'ha-state-domain-icon',

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
       newVal.attributes.rgb_color) {
      this.$.icon.style.color = 'rgb(' + newVal.attributes.rgb_color.join(',') + ')';
    } else {
      this.$.icon.style.color = null;
    }
  },

});
