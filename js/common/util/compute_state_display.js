import computeDomain from './compute_domain';
import formatDateTime from './format_date_time';
import formatDate from './format_date';
import formatTime from './format_time';

export default function computeStateDisplay(haLocalize, stateObj, language) {
  if (!stateObj._stateDisplay) {
    const domain = computeDomain(stateObj);
    if (domain === 'binary_sensor') {
      // Try device class translation, then default binary sensor translation
      if (stateObj.attributes.device_class) {
        stateObj._stateDisplay =
          haLocalize(`state.${domain}.${stateObj.attributes.device_class}`, stateObj.state);
      }
      if (!stateObj._stateDisplay) {
        stateObj._stateDisplay = haLocalize(`state.${domain}.default`, stateObj.state);
      }
    } else if (stateObj.attributes.unit_of_measurement) {
      stateObj._stateDisplay = stateObj.state + ' ' + stateObj.attributes.unit_of_measurement;
    } else if (domain === 'input_datetime') {
      let date;
      if (!stateObj.attributes.has_time) {
        date = new Date(
          stateObj.attributes.year,
          stateObj.attributes.month - 1,
          stateObj.attributes.day
        );
        stateObj._stateDisplay = formatDate(date, language);
      } else if (!stateObj.attributes.has_date) {
        date = new Date(
          1970, 0, 1,
          stateObj.attributes.hour,
          stateObj.attributes.minute
        );
        stateObj._stateDisplay = formatTime(date, language);
      } else {
        date = new Date(
          stateObj.attributes.year, stateObj.attributes.month - 1,
          stateObj.attributes.day, stateObj.attributes.hour,
          stateObj.attributes.minute
        );
        stateObj._stateDisplay = formatDateTime(date, language);
      }
    } else if (domain === 'zwave') {
      if (['initializing', 'dead'].includes(stateObj.state)) {
        stateObj._stateDisplay = haLocalize('state.zwave.query_stage', stateObj.state, 'query_stage', stateObj.attributes.query_stage);
      } else {
        stateObj._stateDisplay = haLocalize('state.zwave.default', stateObj.state);
      }
    } else {
      stateObj._stateDisplay = haLocalize(`state.${domain}`, stateObj.state);
    }
    // Fall back to default or raw state if nothing else matches.
    stateObj._stateDisplay = stateObj._stateDisplay
      || haLocalize('state.default', stateObj.state) || stateObj.state;
  }

  return stateObj._stateDisplay;
}
