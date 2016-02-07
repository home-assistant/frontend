import Polymer from '../polymer';

// Beware: Polymer will not call computeHideIcon and computeHideValue if any of
// the parameters are undefined. Set to null if not using.
export default new Polymer({
  is: 'ha-label-badge',

  properties: {
    value: {
      type: String,
      value: null,
    },

    icon: {
      type: String,
      value: null,
    },

    label: {
      type: String,
      value: null,
    },

    description: {
      type: String,
    },

    image: {
      type: String,
      value: null,
      observer: 'imageChanged',
    },
  },

  computeClasses(value) {
    return value && value.length > 4 ? 'value big' : 'value';
  },

  computeHideIcon(icon, value, image) {
    return !icon || value || image;
  },

  computeHideValue(value, image) {
    return !value || image;
  },

  imageChanged(newVal) {
    this.$.badge.style.backgroundImage = newVal ? `url(${newVal})` : '';
  },
});
