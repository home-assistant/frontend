import Polymer from '../../polymer';
import domainIcon from '../../util/domain-icon';
import stateIcon from '../../util/state-icon';

export default new Polymer({
  is: 'ha-state-label-badge',

  properties: {
    hass: {
      type: Object,
    },

    state: {
      type: Object,
      observer: 'stateChanged',
    },
  },

  listeners: {
    tap: 'badgeTap',
  },

  badgeTap(ev) {
    ev.stopPropagation();
    this.async(() => this.hass.moreInfoActions.selectEntity(this.state.entityId), 1);
  },

  computeClasses(state) {
    switch (state.domain) {
      case 'binary_sensor':
      case 'updater':
        return 'blue';
      default:
        return '';
    }
  },

  computeValue(state) {
    switch (state.domain) {
      case 'binary_sensor':
      case 'device_tracker':
      case 'updater':
      case 'sun':
      case 'alarm_control_panel':
        return null;
      case 'sensor':
      default:
        return state.state === 'unknown' ? '-' : state.state;
    }
  },

  computeIcon(state) {
    if (state.state === 'unavailable') {
      return null;
    }
    switch (state.domain) {
      case 'alarm_control_panel':
        if (state.state === 'pending') {
          return 'mdi:clock-fast';
        } else if (state.state === 'armed_away') {
          return 'mdi:nature';
        } else if (state.state === 'armed_home') {
          return 'mdi:home-variant';
        }
        // state == 'disarmed'
        return domainIcon(state.domain, state.state);
      case 'binary_sensor':
      case 'device_tracker':
      case 'updater':
        return stateIcon(state);
      case 'sun':
        return state.state === 'above_horizon' ?
        domainIcon(state.domain) : 'mdi:brightness-3';
      default:
        return null;
    }
  },

  computeImage(state) {
    return state.attributes.entity_picture || null;
  },

  computeLabel(state) {
    if (state.state === 'unavailable') {
      return 'unavai';
    }
    switch (state.domain) {
      case 'device_tracker':
        return state.state === 'not_home' ? 'Away' : state.state;
      case 'alarm_control_panel':
        if (state.state === 'pending') {
          return 'pend';
        } else if (state.state === 'armed_away' || state.state === 'armed_home') {
          return 'armed';
        }
        // state == 'disarmed'
        return 'disarm';
      default:
        return state.attributes.unit_of_measurement || null;
    }
  },

  computeDescription(state) {
    return state.entityDisplay;
  },

  stateChanged() {
    this.updateStyles();
  },
});
