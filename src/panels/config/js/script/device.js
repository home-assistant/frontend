import { h, Component } from "preact";

import "../../../../components/device/ha-device-picker";
import "../../../../components/device/ha-device-action-picker";

import { onChangeEvent } from "../../../../common/preact/event";

export default class DeviceAction extends Component {
  constructor() {
    super();
    this.onChange = onChangeEvent.bind(this, "action");
    this.devicePicked = this.devicePicked.bind(this);
    this.deviceActionPicked = this.deviceActionPicked.bind(this);
    this.state.device_id = undefined;
  }

  devicePicked(ev) {
    this.setState({ device_id: ev.target.value });
  }

  deviceActionPicked(ev) {
    const deviceAction = ev.target.value;
    this.props.onChange(this.props.index, (this.props.action = deviceAction));
  }

  /* eslint-disable camelcase */
  render({ action, hass }, { device_id }) {
    if (device_id === undefined) device_id = action.device_id;

    return (
      <div>
        <ha-device-picker
          value={device_id}
          onChange={this.devicePicked}
          hass={hass}
          label="Device"
        />
        <ha-device-action-picker
          value={action}
          deviceId={device_id}
          onChange={this.deviceActionPicked}
          hass={hass}
          label="Action"
        />
      </div>
    );
  }
}

DeviceAction.defaultConfig = {
  device_id: "",
  device: "",
  domain: "",
  entity_id: "",
};
