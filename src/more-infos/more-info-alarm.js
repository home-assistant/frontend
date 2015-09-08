import { serviceActions } from '../util/home-assistant-js-instance';

import Polymer from '../polymer';
import attributeClassNames from '../util/attribute-class-names';

const ATTRIBUTE_CLASSES = [];

export default new Polymer({
  is: 'more-info-alarm',
  handle0Tap(number) {
    this.entered_code += '0';
  },
  handle1Tap(number) {
    this.entered_code += '1';
  },
  handle2Tap(number) {
    this.entered_code += '2';
  },
  handle3Tap(number) {
    this.entered_code += '3';
  },
  handle4Tap(number) {
    this.entered_code += '4';
  },
  handle5Tap(number) {
    this.entered_code += '5';
  },
  handle6Tap(number) {
    this.entered_code += '6';
  },
  handle7Tap(number) {
    this.entered_code += '7';
  },
  handle8Tap(number) {
    this.entered_code += '8';
  },
  handle9Tap(number) {
    this.entered_code += '9';
  },
  handleDisarmTap(number) {
    this.callService('alarm_disarm', {code: this.entered_code});
  },
  handleHomeTap(number) {
    this.callService('alarm_arm_home', {code: this.entered_code});
  },
  handleAwayTap(number) {
    this.callService('alarm_arm_away', {code: this.entered_code});
  },
  properties: {
    entered_code: {
      type: String,
      value: '',
    },
  },

  callService(service, data) {
    const serviceData = data || {};
    serviceData.entity_id = this.stateObj.entityId;
    serviceActions.callService('alarm', service, serviceData);
  },
});
