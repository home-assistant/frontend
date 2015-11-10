import Polymer from '../polymer';

export default new Polymer({
  is: 'ha-card',

  properties: {
    header: {
      type: String,
    },
    /**
     * The z-depth of the card, from 0-5.
     */
    elevation: {
      type: Number,
      value: 1,
      reflectToAttribute: true,
    },
  },
});
