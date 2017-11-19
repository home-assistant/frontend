import computeDomain from './compute_domain';
import formatDateTime from './format_date_time';
import formatDate from './format_date';
import formatTime from './format_time';

export default function computeStateDisplay(haLocalize, stateObj, language) {
  if (!haLocalize || !stateObj || !language) {
    return null;
  }

  let stateDisplay = null;

  const domain = computeDomain(stateObj);
  if (domain === 'binary_sensor') {
    // Try device class translation, then default binary sensor translation
    if (stateObj.attributes.device_class) {
      stateDisplay =
        haLocalize(`state.${domain}.${stateObj.attributes.device_class}`, stateObj.state);
    }
    if (!stateDisplay) {
      stateDisplay = haLocalize(`state.${domain}.default`, stateObj.state);
    }
  } else if (stateObj.attributes.unit_of_measurement) {
    stateDisplay = stateObj.state + ' ' + stateObj.attributes.unit_of_measurement;
  } else if (domain === 'input_datetime') {
    let date;
    if (!stateObj.attributes.has_time) {
      date = new Date(
        stateObj.attributes.year,
        stateObj.attributes.month - 1,
        stateObj.attributes.day
      );
      stateDisplay = formatDate(date, language);
    } else if (!stateObj.attributes.has_date) {
      date = new Date(
        1970, 0, 1,
        stateObj.attributes.hour,
        stateObj.attributes.minute
      );
      stateDisplay = formatTime(date, language);
    } else {
      date = new Date(
        stateObj.attributes.year, stateObj.attributes.month - 1,
        stateObj.attributes.day, stateObj.attributes.hour,
        stateObj.attributes.minute
      );
      stateDisplay = formatDateTime(date, language);
    }
  } else if (domain === 'zwave') {
    if (['initializing', 'dead'].includes(stateObj.state)) {
      stateDisplay = haLocalize('state.zwave.query_stage', stateObj.state, 'query_stage', stateObj.attributes.query_stage);
    } else {
      stateDisplay = haLocalize('state.zwave.default', stateObj.state);
    }
  } else {
    stateDisplay = haLocalize(`state.${domain}`, stateObj.state);
  }
  // Fall back to default or raw state if nothing else matches.
  stateDisplay = stateDisplay
    || haLocalize('state.default', stateObj.state) || stateObj.state;

  return stateDisplay;
}
