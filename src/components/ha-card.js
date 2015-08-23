import Polymer from '../polymer';

export default new Polymer({
  is: 'ha-card',

  properties: {
    title: {
      type: String,
    },
    header: {
      type: String,
    },
  },
});
