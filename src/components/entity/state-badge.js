import Polymer from '../../polymer';

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
    // hide icon if we have entity picture
    if (newVal.attributes.entity_picture) {
      this.style.backgroundImage = `url(${newVal.attributes.entity_picture})`;
      this.$.icon.style.display = 'none';
      return;
    }

    this.style.backgroundImage = '';
    this.$.icon.style.display = 'inline';

    // for domain light, set color of icon to light color if available and it is
    // not very white (sum rgb colors < 730)
    if (newVal.domain === 'light' && newVal.state === 'on' &&
       newVal.attributes.rgb_color &&
       newVal.attributes.rgb_color.reduce((cur, tot) => cur + tot, 0) < 730) {
      this.$.icon.style.color = `rgb(${newVal.attributes.rgb_color.join(',')})`;
    } else {
      this.$.icon.style.color = null;
    }
  },

});
