/**
 * Export hass util functions to window.
 *
 * This file is a workaround for the fact that Polymer 2 doesn't work well with
 * ES6 JS imports. Once we move to Polymer 3, we should be able to simply
 * import these functions where we need them.
 */
import fecha from 'fecha';

// const
import {
  DEFAULT_DOMAIN_ICON,
  DOMAINS_MORE_INFO_NO_HISTORY,
  STATES_OFF,
} from './common/const.js';

// config
import computeLocationName from './common/config/location_name';
import isComponentLoaded from './common/config/is_component_loaded.js';

// dom
import applyThemesOnElement from './common/dom/apply_themes_on_element.js';
import dynamicContentUpdater from './common/dom/dynamic_content_updater.js';

// datetime
import durationToSeconds from './common/datetime/duration_to_seconds.js';
import formatDate from './common/datetime/format_date.js';
import formatDateTime from './common/datetime/format_date_time.js';
import formatTime from './common/datetime/format_time.js';
import relativeTime from './common/datetime/relative_time.js';
import secondsToDuration from './common/datetime/seconds_to_duration.js';

// entity
import attributeClassNames from './common/entity/attribute_class_names.js';
import binarySensorIcon from './common/entity/binary_sensor_icon.js';
import canToggleDomain from './common/entity/can_toggle_domain.js';
import canToggleState from './common/entity/can_toggle_state.js';
import computeDomain from './common/entity/compute_state_domain.js';
import computeObjectId from './common/entity/compute_object_id.js';
import computeStateDisplay from './common/entity/compute_state_display.js';
import computeStateName from './common/entity/compute_state_name.js';
import coverIcon from './common/entity/cover_icon.js';
import domainIcon from './common/entity/domain_icon.js';
import featureClassNames from './common/entity/feature_class_names.js';
import sensorIcon from './common/entity/sensor_icon.js';
import sortByName from './common/entity/states_sort_by_name.js';
import stateCardType from './common/entity/state_card_type.js';
import stateIcon from './common/entity/state_icon.js';
import stateMoreInfoType from './common/entity/state_more_info_type.js';
import timerTimeRemaining from './common/entity/timer_time_remaining.js';

const language = navigator.languages ?
  navigator.languages[0] : navigator.language || navigator.userLanguage;

fecha.masks.haDateTime = `${fecha.masks.shortTime} ${fecha.masks.mediumDate}`;

window.hassUtil = {
  // const
  DEFAULT_ICON: DEFAULT_DOMAIN_ICON,
  OFF_STATES: STATES_OFF,
  DOMAINS_WITH_NO_HISTORY: DOMAINS_MORE_INFO_NO_HISTORY,

  // config
  computeLocationName,
  isComponentLoaded,

  // datetime
  durationToSeconds,
  formatDate: dateObj => formatDate(dateObj, language),
  formatDateTime: dateObj => formatDateTime(dateObj, language),
  formatTime: dateObj => formatTime(dateObj, language),
  relativeTime,

  // dom
  applyThemesOnElement,
  dynamicContentUpdater,

  // entity
  attributeClassNames,
  binarySensorIcon,
  canToggleDomain,
  canToggleState,
  computeDomain,
  computeObjectId,
  computeStateDisplay,
  computeStateName,
  coverIcon,
  domainIcon,
  featureClassNames,
  secondsToDuration,
  sensorIcon,
  sortByName,
  stateCardType,
  stateIcon,
  stateMoreInfoType,
  timerTimeRemaining,
};
