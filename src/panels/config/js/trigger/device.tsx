import { h, Component } from "preact";

import "../../../../components/device/ha-device-picker";
import "../../../../components/device/ha-device-trigger-picker";
import "../../../../components/ha-form";
import "../../../../components/paper-time-input";

import { fetchDeviceTriggerCapabilities } from "../../../../data/device_automation";

export default class DeviceTrigger extends Component<any, any> {
  private hass;
  constructor() {
    super();

    this.devicePicked = this.devicePicked.bind(this);
    this.deviceTriggerPicked = this.deviceTriggerPicked.bind(this);
    this._extraFieldsChanged = this._extraFieldsChanged.bind(this);
    this.state = { device_id: undefined, capabilities: undefined };
  }

  public devicePicked(ev) {
    this.setState({ ...this.state, device_id: ev.target.value });
  }

  public async deviceTriggerPicked(ev) {
    const deviceTrigger = ev.target.value;
    const capabilities = deviceTrigger.domain
      ? await fetchDeviceTriggerCapabilities(this.hass, deviceTrigger)
      : null;
    this.setState({ ...this.state, capabilities });
    this.props.onChange(this.props.index, deviceTrigger);
  }

  /* eslint-disable camelcase */
  public render({ trigger, hass }, { device_id }) {
    this.hass = hass;
    if (!this.state.capabilities && trigger.domain) {
      fetchDeviceTriggerCapabilities(this.hass, trigger).then(
        (capabilities) => {
          this.setState({ ...this.state, capabilities });
        }
      );
    }
    if (device_id === undefined) {
      device_id = trigger.device_id;
    }
    let extra_fields_data = {}
    if (this.state.capabilities && this.state.capabilities.extra_fields) {
      for (let i in this.state.capabilities.extra_fields) {
        let item = this.state.capabilities.extra_fields[i]
        extra_fields_data = {
          ...extra_fields_data,
          [item.name]: this.props.trigger[item.name],
        };
      }
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
        {this.state.capabilities && this.state.capabilities.extra_fields && (
          <ha-form
            data={ extra_fields_data }
            data-changed={this._extraFieldsChanged}
            ondata-changed={this._extraFieldsChanged}
            onData-changed={this._extraFieldsChanged}
            on-data-changed={this._extraFieldsChanged}
            schema={this.state.capabilities.extra_fields}
            //.error=${step.errors}
            //.computeLabel=${this._labelCallback}
            //.computeError=${this._errorCallback}
          ></ha-form>
        )}
      </div>
    );
  }

  private _extraFieldsChanged(ev) {
    console.log(ev, ev.detail.value, JSON.stringify(ev.detail));
    if (!ev.detail.path) {
      return;
    }
    const item = ev.detail.path.replace("data.", "");
    const value = ev.detail.value;

    this.props.onChange(this.props.index, {
      ...this.props.trigger,
      [item]: value,
    });
  }
}

(DeviceTrigger as any).defaultConfig = {
  device_id: "",
  domain: "",
  entity_id: "",
};
