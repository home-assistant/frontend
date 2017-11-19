/**
 * Export hass util functions to window.
 *
 * This file is a workaround for the fact that Polymer 2 doesn't work well with
 * ES6 JS imports. Once we move to Polymer 3, we should be able to simply
 * import these functions where we need them.
 */

import attributeClassNames from './common/util/attribute_class_names';
import computeDomain from './common/util/compute_domain';
import computeStateDisplay from './common/util/compute_state_display';
import formatDate from './common/util/format_date';
import formatDateTime from './common/util/format_date_time';
import formatTime from './common/util/format_time';

window.hassUtil = window.hassUtil || {};

const language = navigator.languages ?
  navigator.languages[0] : navigator.language || navigator.userLanguage;

window.fecha.masks.haDateTime = window.fecha.masks.shortTime + ' ' + window.fecha.masks.mediumDate;

window.hassUtil.attributeClassNames = attributeClassNames;
window.hassUtil.computeDomain = computeDomain;
window.hassUtil.computeStateDisplay = computeStateDisplay;
window.hassUtil.formatDate = dateObj => formatDate(dateObj, language);
window.hassUtil.formatDateTime = dateObj => formatDateTime(dateObj, language);
window.hassUtil.formatTime = dateObj => formatTime(dateObj, language);
