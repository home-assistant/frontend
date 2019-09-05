import { h, Component } from "preact";

import "../../../../components/device/ha-device-picker";
import "../../../../components/device/ha-device-condition-picker";

import { onChangeEvent } from "../../../../common/preact/event";

export default class DeviceCondition extends Component {
  constructor() {
    super();
    this.onChange = onChangeEvent.bind(this, "condition");
    this.devicePicked = this.devicePicked.bind(this);
    this.deviceConditionPicked = this.deviceConditionPicked.bind(this);
    this.state.device_id = undefined;
  }

  devicePicked(ev) {
    this.setState({ device_id: ev.target.value });
  }

  deviceConditionPicked(ev) {
    const deviceCondition = ev.target.value;
    this.props.onChange(
      this.props.index,
      (this.props.condition = deviceCondition)
    );
  }

  /* eslint-disable camelcase */
  render({ condition, hass }, { device_id }) {
    if (device_id === undefined) device_id = condition.device_id;

    return (
      <div>
        <ha-device-picker
          value={device_id}
          onChange={this.devicePicked}
          hass={hass}
          label="Device"
        />
        <ha-device-condition-picker
          value={condition}
          deviceId={device_id}
          onChange={this.deviceConditionPicked}
          hass={hass}
          label="Condition"
        />
      </div>
    );
  }
}

DeviceCondition.defaultConfig = {
  device_id: "",
  domain: "",
  entity_id: "",
};
