import Polymer from '../../polymer';
import {
  moreInfoActions,
  serviceActions,
} from '../../util/home-assistant-js-instance';
import domainIcon from '../../util/domain-icon';
import canToggle from '../../util/can-toggle';

require('../../components/ha-label-badge');

export default new Polymer({
  is: 'ha-state-label-badge',

  properties: {
    state: {
      type: Object,
      observer: 'stateChanged',
    },
  },

  listeners: {
    'click': 'badgeTap',
  },

  badgeTap(ev) {
    ev.stopPropagation();
    if (!canToggle(this.state.entityId)) {
      this.async(() => moreInfoActions.selectEntity(this.state.entityId), 1);
      return;
    }
    if (this.state.domain === 'scene') {
      serviceActions.callTurnOn(this.state.entityId);
    } else if (this.state.state === 'off') {
      serviceActions.callTurnOn(this.state.entityId);
    } else {
      serviceActions.callTurnOff(this.state.entityId);
    }
  },

  computeClasses(state) {
    switch (state.domain) {
    case 'binary_sensor':
      return state.state === 'on' ? 'green' : 'red';
    case 'scene':
      return 'green';
    case 'script':
      return state.state === 'on' ? 'blue' : 'grey';
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
    case 'scene':
    case 'script':
    case 'alarm_control_panel':
      return undefined;
    case 'sensor':
      return state.state;
    default:
      return state.state;
    }
  },

  computeIcon(state) {
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
      return 'mdi:lock-open';
    case 'binary_sensor':
      if (state.state === 'on') {
        return 'mdi:radiobox-marked';
      }
      // state == 'off'
      return 'mdi:radiobox-blank';
    case 'device_tracker':
    case 'scene':
    case 'script':
      return domainIcon(state.domain, state.state);
    case 'updater':
      return domainIcon(state.domain);
    case 'sun':
      return state.state === 'above_horizon' ?
        domainIcon(state.domain) : 'mdi:brightness-3';
    default:
      return undefined;
    }
  },

  computeImage(state) {
    return state.attributes.entity_picture;
  },

  computeLabel(state) {
    switch (state.domain) {
    case 'scene':
    case 'script':
      return state.domain;
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
      return state.attributes.unit_of_measurement;
    }
  },

  computeDescription(state) {
    return state.entityDisplay;
  },

  stateChanged() {
    this.updateStyles();
  },
});
