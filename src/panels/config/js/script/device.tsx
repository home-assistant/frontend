import { h, Component } from "preact";

import "../../../../components/device/ha-device-picker";
import "../../../../components/device/ha-device-action-picker";
import { HomeAssistant } from "../../../../types";
import { DeviceAction } from "../../../../data/script";

export default class DeviceActionEditor extends Component<
  {
    index: number;
    action: DeviceAction;
    hass: HomeAssistant;
    onChange(index: number, action: DeviceAction);
  },
  {
    device_id: string | undefined;
  }
> {
  public static defaultConfig: DeviceAction = {
    device_id: "",
    domain: "",
    entity_id: "",
  };

  constructor() {
    super();
    this.devicePicked = this.devicePicked.bind(this);
    this.deviceActionPicked = this.deviceActionPicked.bind(this);
    this.state = { device_id: undefined };
  }

  public render() {
    const { action, hass } = this.props;
    const deviceId = this.state.device_id || action.device_id;

    return (
      <div>
        <ha-device-picker
          value={deviceId}
          onChange={this.devicePicked}
          hass={hass}
          label="Device"
        />
        <ha-device-action-picker
          value={action}
          deviceId={deviceId}
          onChange={this.deviceActionPicked}
          hass={hass}
          label="Action"
        />
      </div>
    );
  }

  private devicePicked(ev) {
    this.setState({ device_id: ev.target.value });
  }

  private deviceActionPicked(ev) {
    const deviceAction = { ...ev.target.value };
    this.props.onChange(this.props.index, deviceAction);
  }
}
