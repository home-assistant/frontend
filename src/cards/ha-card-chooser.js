import Polymer from '../polymer';

require('./ha-camera-card');
require('./ha-entities-card');
require('./ha-introduction-card');

export default new Polymer({
  is: 'ha-card-chooser',

  properties: {
    cardData: {
      type: Object,
      observer: 'cardDataChanged',
    },
  },

  cardDataChanged(newData, oldData) {
    const root = Polymer.dom(this);

    if (!newData) {
      if (root.lastChild) {
        root.removeChild(root.lastChild);
      }
      return;
    }

    const newElement = !oldData || oldData.cardType !== newData.cardType;
    let card;
    if (newElement) {
      if (root.lastChild) {
        root.removeChild(root.lastChild);
      }

      card = document.createElement(`ha-${newData.cardType}-card`);
    } else {
      card = root.lastChild;
    }

    Object.keys(newData).forEach(key => card[key] = newData[key]);

    if (oldData) {
      Object.keys(oldData).forEach(key => {
        if (!(key in newData)) {
          card[key] = undefined;
        }
      });
    }

    if (newElement) {
      root.appendChild(card);
    }
  },
});
