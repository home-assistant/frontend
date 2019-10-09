import { h, Component } from "preact";

import "../../../../components/device/ha-device-picker";
import "../../../../components/device/ha-device-trigger-picker";
import "../../../../components/ha-form";

import { fetchDeviceTriggerCapabilities } from "../../../../data/device_automation";

export default class DeviceTrigger extends Component<any, any> {
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
      ? await fetchDeviceTriggerCapabilities(this.props.hass, deviceTrigger)
      : null;
    this.setState({ ...this.state, capabilities });
    this.props.onChange(this.props.index, deviceTrigger);
  }

  /* eslint-disable camelcase */
  public render({ trigger, hass }, { device_id }) {
    if (device_id === undefined) {
      device_id = trigger.device_id;
    }
    let extraFieldsData = {};
    if (this.state.capabilities && this.state.capabilities.extra_fields) {
      this.state.capabilities.extra_fields.forEach(
        (item) =>
          (extraFieldsData = {
            ...extraFieldsData,
            [item.name]: this.props.trigger[item.name],
          })
      );
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
            data={extraFieldsData}
            onData-changed={this._extraFieldsChanged}
            schema={this.state.capabilities.extra_fields}
            // error={step.errors} // TODO
            computeLabel={this._extraFieldsComputeLabelCallback(hass.localize)}
            computeSuffix={this._extraFieldsComputeSuffixCallback()}
            // computeError={this._extraFieldsComputeErrorCallback} // TODO
          />
        )}
      </div>
    );
  }

  public componentDidMount() {
    const hass = this.props.hass;
    const trigger = this.props.trigger;

    if (!this.state.capabilities && trigger.domain) {
      fetchDeviceTriggerCapabilities(hass, trigger).then((capabilities) => {
        this.setState({ ...this.state, capabilities });
      });
    }
  }

  private _extraFieldsChanged(ev) {
    if (!ev.detail.path) {
      return;
    }
    const item = ev.detail.path.replace("data.", "");
    const value = ev.detail.value || undefined;

    this.props.onChange(this.props.index, {
      ...this.props.trigger,
      [item]: value,
    });
  }

  private _extraFieldsComputeLabelCallback(localize) {
    // Returns a callback for ha-form to calculate labels per schema object
    return (schema) =>
      localize(
        `ui.panel.config.automation.editor.triggers.type.device.extra_fields.${
          schema.name
        }`
      ) || schema.name;
  }

  private _extraFieldsComputeSuffixCallback() {
    // Returns a callback for ha-form to calculate suffixes per schema object
    return (schema) => {
      let description = "";
      if (schema.description) {
        description = schema.description.unit_of_measurement || "";
      }
      return description;
    };
  }
}

(DeviceTrigger as any).defaultConfig = {
  device_id: "",
  domain: "",
  entity_id: "",
};
