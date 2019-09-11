import { h, Component } from "preact";

import "../../../../components/device/ha-device-picker";
import "../../../../components/device/ha-device-trigger-picker";

export default class DeviceTrigger extends Component<any, any> {
  constructor() {
    super();
    this.devicePicked = this.devicePicked.bind(this);
    this.deviceTriggerPicked = this.deviceTriggerPicked.bind(this);
    this.state = { device_id: undefined };
  }

  public devicePicked(ev) {
    this.setState({ device_id: ev.target.value });
  }

  public deviceTriggerPicked(ev) {
    const deviceTrigger = ev.target.value;
    this.props.onChange(this.props.index, deviceTrigger);
  }

  /* eslint-disable camelcase */
  public render({ trigger, hass }, { device_id }) {
    if (device_id === undefined) {
      device_id = trigger.device_id;
    }

    return (
      <div>
        <ha-device-picker
          value={device_id}
          onChange={this.devicePicked}
          hass={hass}
          label="Device"
        />
        <ha-device-trigger-picker
          value={trigger}
          deviceId={device_id}
          onChange={this.deviceTriggerPicked}
          hass={hass}
          label="Trigger"
        />
      </div>
    );
  }
}

(DeviceTrigger as any).defaultConfig = {
  device_id: "",
  domain: "",
  entity_id: "",
};
