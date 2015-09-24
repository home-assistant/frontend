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
    stateObj: {
      type: Object,
      observer: 'stateObjChanged',
    },
    entered_code: {
      type: String,
      value: '',
    },
    disarm_button_enabled: {
      type: Boolean,
      value: false,
    },
    arm_home_button_enabled: {
      type: Boolean,
      value: false,
    },
    arm_away_button_enabled: {
      type: Boolean,
      value: false,
    },
    code_input_visible: {
      type: Boolean,
      value: false,
    },
    code_input_enabled: {
      type: Boolean,
      value: false,
    },
    code_format: {
      type: String,
      value: '',
    },
    code_valid: {
      type: Boolean,
      value: false,
    },
  },
  validate_code(code) {
    if(this.code_format == null){
      this.code_valid = true;
      return;
    }
    var re = new RegExp(this.code_format);
    this.code_valid = re.test(code);
  },
  entered_code_changed(ev) {
    this.validate_code(ev.target.value);
  },
  stateObjChanged(newVal) {
    if (newVal) {
      this.code_format = newVal.attributes.code_format;
      this.validate_code(this.entered_code);
      this.code_input_visible = newVal.attributes.code_format != null;
      this.code_input_enabled = (newVal.state === 'armed_home' || newVal.state === 'armed_away' || newVal.state === 'disarmed');
      this.disarm_button_enabled = (newVal.state === 'armed_home' || newVal.state === 'armed_away');
      this.arm_home_button_enabled = newVal.state === 'disarmed';
      this.arm_away_button_enabled = newVal.state === 'disarmed';
    }
    this.async(() => this.fire('iron-resize'), 500);
  },
  callService(service, data) {
    const serviceData = data || {};
    serviceData.entity_id = this.stateObj.entityId;
    serviceActions.callService('alarm_control_panel', service, serviceData);
  },
});
