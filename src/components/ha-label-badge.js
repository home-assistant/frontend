import Polymer from '../polymer';

export default new Polymer({
  is: 'ha-label-badge',

  properties: {
    value: {
      type: String,
    },

    icon: {
      type: String,
    },

    label: {
      type: String,
    },

    description: {
      type: String,
    },

    image: {
      type: String,
      observe: 'imageChanged',
    },
  },

  computeClasses(value) {
    return value && value.length > 4 ? 'value big' : 'value';
  },
});
