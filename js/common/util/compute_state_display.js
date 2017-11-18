export default function computeStateDisplay(haLocalize, stateObj) {
  if (!stateObj._stateDisplay) {
    const domain = window.hassUtil.computeDomain(stateObj);
    if (domain === 'binary_sensor') {
      // Try device class translation, then default binary sensor translation
      stateObj._stateDisplay =
        haLocalize(`state.${domain}.${stateObj.attributes.device_class}`, stateObj.state)
        || haLocalize(`state.${domain}.default`, stateObj.state);
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
        stateObj._stateDisplay = window.hassUtil.formatDate(date);
      } else if (!stateObj.attributes.has_date) {
        date = new Date(
          1970, 0, 1,
          stateObj.attributes.hour,
          stateObj.attributes.minute
        );
        stateObj._stateDisplay = window.hassUtil.formatTime(date);
      } else {
        date = new Date(
          stateObj.attributes.year, stateObj.attributes.month - 1,
          stateObj.attributes.day, stateObj.attributes.hour,
          stateObj.attributes.minute
        );
        stateObj._stateDisplay = window.hassUtil.formatDateTime(date);
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
