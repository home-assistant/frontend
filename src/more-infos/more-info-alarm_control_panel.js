import { serviceActions } from '../util/home-assistant-js-instance';

import Polymer from '../polymer';

export default new Polymer({
  is: 'more-info-alarm_control_panel',
  handleDisarmTap() {
    this.callService('alarm_disarm', {code: this.entered_code});
  },
  handleHomeTap() {
    this.callService('alarm_arm_home', {code: this.entered_code});
  },
  handleAwayTap() {
    this.callService('alarm_arm_away', {code: this.entered_code});
  },
  properties: {
    entered_code: {
      type: String,
      value: '',
    },
  },
  enteredCodeChanged(ev) {
    this.entered_code = ev.target.value;
  },
  callService(service, data) {
    const serviceData = data || {};
    serviceData.entity_id = this.stateObj.entityId;
    serviceActions.callService('alarm_control_panel', service, serviceData);
  },
});
