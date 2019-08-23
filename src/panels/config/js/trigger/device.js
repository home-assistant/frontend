import { h, Component } from "preact";

import "../../../../components/device/ha-device-picker";
import "../../../../components/device/ha-device-trigger-picker";

import { onChangeEvent } from "../../../../common/preact/event";

import { triggersEqual } from "../../../../data/device_automation";

export default class DeviceTrigger extends Component {
  constructor() {
    super();
    this.onChange = onChangeEvent.bind(this, "trigger");
    this.devicePicked = this.devicePicked.bind(this);
    this.deviceTriggerPicked = this.deviceTriggerPicked.bind(this);
  }

  devicePicked(ev) {
    this.deviceId = ev.target.value;
    let deviceTrigger = {};

    // Reset the trigger if device is changed
    deviceTrigger.platform = "device";
    deviceTrigger.device_id = this.deviceId;
    this.props.onChange(this.props.index, (this.props.trigger = deviceTrigger));
  }

  deviceTriggerPicked(ev) {
    let deviceTrigger = ev.target.trigger;
    this.props.onChange(this.props.index, (this.props.trigger = deviceTrigger));
  }

  /* eslint-disable camelcase */
  render({ trigger, hass, localize }) {
    const { device_id } = trigger;
    const jsontrigger = trigger;

    return (
      <div>
        <ha-device-picker
          value={device_id}
          onChange={this.devicePicked}
          hass={hass}
          label="Device"
        />
        <ha-device-trigger-picker
          presetTrigger={jsontrigger}
          deviceId={device_id}
          onChange={this.deviceTriggerPicked}
          hass={hass}
          label="Trigger"
        />
      </div>
    );
  }
}

DeviceTrigger.defaultConfig = {
  device_id: "",
};
