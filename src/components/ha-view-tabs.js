import Polymer from '../polymer';

export default new Polymer({
  is: 'ha-view-tabs',

  behaviors: [window.hassBehavior],

  properties: {
    hass: {
      type: Object,
    },

    locationName: {
      type: String,
      bindNuclear: hass => hass.configGetters.locationName,
    },

    currentView: {
      type: String,
      bindNuclear: hass => [
        hass.viewGetters.currentView,
        view => view || '',
      ],
    },

    views: {
      type: Array,
      bindNuclear: hass => [
        hass.viewGetters.views,
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
      this.async(() => this.hass.viewActions.selectView(view), 0);
    }
  },
});
