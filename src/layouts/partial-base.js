import Polymer from '../polymer';

export default new Polymer({
  is: 'partial-base',

  properties: {
    narrow: {
      type: Boolean,
      value: false,
    },
  },

  toggleMenu() {
    this.fire('open-menu');
  },
});
