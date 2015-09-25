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
    if (this.state.domain === 'scene' && this.state.state === 'on' &&
        !this.state.attributes.active_requested) {
      // Scenes that are on but by virtue of other events then itself
      // being turned on cannot be turned off.
      return;
    } else if (this.state.state === 'off') {
      serviceActions.callTurnOn(this.state.entityId);
    } else {
      serviceActions.callTurnOff(this.state.entityId);
    }
  },

  computeClasses(state) {
    switch (state.domain) {
    case 'scene':
    case 'script':
      return state.state === 'on' ? 'blue' : 'grey';
    default:
      return '';
    }
  },

  computeGlow(state) {
    switch (state.domain) {
    case 'scene':
    case 'script':
      return state.state === 'on';
    default:
      return false;
    }
  },

  computeValue(state) {
    switch (state.domain) {
    case 'device_tracker':
    case 'sun':
    case 'scene':
    case 'script':
    case 'alarm_control_panel':
      return undefined;
    case 'sensor':
      return state.attributes.unit_of_measurement && state.state;
    default:
      return state.state;
    }
  },

  computeIcon(state) {
    switch (state.domain) {
    case 'device_tracker':
    case 'alarm_control_panel':
    case 'scene':
    case 'script':
      return domainIcon(state.domain, state.state);
    case 'sensor':
      return !state.attributes.unit_of_measurement && domainIcon(state.domain);
    case 'sun':
      return state.state === 'above_horizon' ?
        'image:wb-sunny' : 'image:brightness-3';
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
    case 'sensor':
      return state.attributes.unit_of_measurement || state.state;
    case 'device_tracker':
      return state.state === 'not_home' ? 'Away' : state.state;
    case 'alarm_control_panel':
      return state.state;
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
