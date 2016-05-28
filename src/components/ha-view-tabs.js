import hass from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import nuclearObserver from '../util/bound-nuclear-behavior';

const {
  configGetters,
  viewActions,
  viewGetters,
} = hass;

export default new Polymer({
  is: 'ha-view-tabs',

  behaviors: [nuclearObserver],

  properties: {
    locationName: {
      type: String,
      bindNuclear: configGetters.locationName,
    },

    currentView: {
      type: String,
      bindNuclear: [
        viewGetters.currentView,
        view => view || '',
      ],
    },

    views: {
      type: Array,
      bindNuclear: [
        viewGetters.views,
        views => views.valueSeq()
                    .sortBy(view => view.attributes.order)
                    .toArray(),
      ],
    },
  },

  viewTapped() {
    this.fire('view-tapped');
  },

  viewSelected(ev) {
    const view = ev.detail.item.getAttribute('data-entity') || null;
    const current = this.currentView || null;
    this.expectChange = true;
    if (view !== current) {
      this.async(() => viewActions.selectView(view), 0);
    }
  },
});
