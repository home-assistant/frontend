import { h, Component } from "preact";

import "../../../../components/device/ha-device-picker";
import "../../../../components/device/ha-device-trigger-picker";

import { onChangeEvent } from "../../../../common/preact/event";

export default class DeviceTrigger extends Component {
  constructor() {
    super();
    this.onChange = onChangeEvent.bind(this, "trigger");
    this.devicePicked = this.devicePicked.bind(this);
    this.deviceTriggerPicked = this.deviceTriggerPicked.bind(this);
  }

  devicePicked(ev) {
    this.deviceId = ev.target.value;
    // Reset the trigger if device is changed
    const deviceTrigger = { platform: "device", device_id: this.deviceId };

    this.props.onChange(this.props.index, (this.props.trigger = deviceTrigger));
  }

  deviceTriggerPicked(ev) {
    const deviceTrigger = ev.target.trigger;
    this.props.onChange(this.props.index, (this.props.trigger = deviceTrigger));
  }

  /* eslint-disable camelcase */
  render({ trigger, hass }) {
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
