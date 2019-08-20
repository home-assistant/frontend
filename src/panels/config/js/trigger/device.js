import { h, Component } from "preact";

import "../../../../components/device/ha-device-picker";
import "../../../../components/device/ha-device-trigger-picker";

import { onChangeEvent } from "../../../../common/preact/event";

function isObject(v) {
  return "[object Object]" === Object.prototype.toString.call(v);
}

JSON.sort = function(o) {
  if (Array.isArray(o)) {
    return o.sort().map(JSON.sort);
  } else if (isObject(o)) {
    return Object.keys(o)
      .sort()
      .reduce(function(a, k) {
        a[k] = JSON.sort(o[k]);

        return a;
      }, {});
  }

  return o;
};

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
    let deviceTrigger = JSON.parse(ev.target.value);
    this.props.onChange(this.props.index, (this.props.trigger = deviceTrigger));
  }

  /* eslint-disable camelcase */
  render({ trigger, hass, localize }) {
    const { device_id } = trigger;
    const jsontrigger = JSON.stringify(JSON.sort(trigger));

    return (
      <div>
        <ha-device-picker
          value={device_id}
          onChange={this.devicePicked}
          hass={hass}
          label="Device"
        />
        <ha-device-trigger-picker
          value={jsontrigger}
          deviceId={device_id}
          onChange={this.deviceTriggerPicked}
          hass={hass}
          localize={localize}
          label="Trigger"
        />
      </div>
    );
  }
}

DeviceTrigger.defaultConfig = {
  device_id: "",
};
