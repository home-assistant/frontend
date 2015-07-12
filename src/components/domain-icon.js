import Polymer from '../polymer';

import domainIcon from '../util/domain-icon';

export default Polymer({
  is: 'domain-icon',

  properties: {
    domain: {
      type: String,
      value: '',
    },

    state: {
      type: String,
      value: '',
    },
  },

  computeIcon(domain, state) {
    return domainIcon(domain, state);
  },
});
