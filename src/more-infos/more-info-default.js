import Polymer from '../polymer';

const FILTER_KEYS = ['entity_picture', 'friendly_name', 'unit_of_measurement'];

export default new Polymer({
  is: 'more-info-default',

  properties: {
    stateObj: {
      type: Object,
    },
  },

  computeDisplayAttributes(stateObj) {
    if (!stateObj) {
      return [];
    }

    return Object.keys(stateObj.attributes).filter((key) => FILTER_KEYS.indexOf(key) === -1);
  },

  getAttributeValue(stateObj, attribute) {
    return stateObj.attributes[attribute];
  },
});
