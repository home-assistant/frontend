/**
 * Export hass util functions to window.
 *
 * This file is a workaround for the fact that Polymer 2 doesn't work well with
 * ES6 JS imports. Once we move to Polymer 3, we should be able to simply
 * import these functions where we need them.
 */

import attributeClassNames from './common/util/attribute_class_names.js';
import canToggleDomain from './common/util/can_toggle_domain.js';
import canToggleState from './common/util/can_toggle_state.js';
import computeStateDomain from './common/util/compute_state_domain.js';
import computeStateDisplay from './common/util/compute_state_display.js';
import featureClassNames from './common/util/feature_class_names.js';
import formatDate from './common/util/format_date.js';
import formatDateTime from './common/util/format_date_time.js';
import formatTime from './common/util/format_time.js';
import stateCardType from './common/util/state_card_type.js';
import stateMoreInfoType from './common/util/state_more_info_type.js';

window.hassUtil = window.hassUtil || {};

const language = navigator.languages ?
  navigator.languages[0] : navigator.language || navigator.userLanguage;

window.fecha.masks.haDateTime = window.fecha.masks.shortTime + ' ' + window.fecha.masks.mediumDate;

window.hassUtil.attributeClassNames = attributeClassNames;
window.hassUtil.canToggleDomain = canToggleDomain;
window.hassUtil.canToggleState = canToggleState;
window.hassUtil.computeDomain = computeStateDomain;
window.hassUtil.computeStateDisplay = computeStateDisplay;
window.hassUtil.featureClassNames = featureClassNames;
window.hassUtil.formatDate = dateObj => formatDate(dateObj, language);
window.hassUtil.formatDateTime = dateObj => formatDateTime(dateObj, language);
window.hassUtil.formatTime = dateObj => formatTime(dateObj, language);
window.hassUtil.stateCardType = stateCardType;
window.hassUtil.stateMoreInfoType = stateMoreInfoType;
