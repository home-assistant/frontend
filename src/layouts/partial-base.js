import Polymer from '../polymer';

export default Polymer({
  is: 'partial-base',

  properties: {
    narrow: {
      type: Boolean,
      value: false,
    },
  },

  toggleMenu: function() {
    this.fire('open-menu');
  },
});
