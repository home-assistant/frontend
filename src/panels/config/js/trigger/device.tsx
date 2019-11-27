import { h, Component } from "preact";

import "../../../../components/device/ha-device-picker";
import "../../../../components/device/ha-device-trigger-picker";
import "../../../../components/ha-form/ha-form";

import {
  fetchDeviceTriggerCapabilities,
  deviceAutomationsEqual,
} from "../../../../data/device_automation";

export default class DeviceTrigger extends Component<any, any> {
  private _origTrigger;

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

  public deviceTriggerPicked(ev) {
    let trigger = ev.target.value;
    if (
      this._origTrigger &&
      deviceAutomationsEqual(this._origTrigger, trigger)
    ) {
      trigger = this._origTrigger;
    }
    this.props.onChange(this.props.index, trigger);
  }

  /* eslint-disable camelcase */
  public render({ trigger, hass }, { device_id, capabilities }) {
    if (device_id === undefined) {
      device_id = trigger.device_id;
    }
    const extraFieldsData =
      capabilities && capabilities.extra_fields
        ? capabilities.extra_fields.map((item) => {
            return { [item.name]: this.props.trigger[item.name] };
          })
        : undefined;

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
        {extraFieldsData && (
          <ha-form
            data={Object.assign({}, ...extraFieldsData)}
            schema={this.state.capabilities.extra_fields}
            computeLabel={this._extraFieldsComputeLabelCallback(hass.localize)}
            onvalue-changed={this._extraFieldsChanged}
          />
        )}
      </div>
    );
  }

  public componentDidMount() {
    if (!this.state.capabilities) {
      this._getCapabilities();
    }
    if (this.props.trigger) {
      this._origTrigger = this.props.trigger;
    }
  }

  public componentDidUpdate(prevProps) {
    if (!deviceAutomationsEqual(prevProps.trigger, this.props.trigger)) {
      this._getCapabilities();
    }
  }

  private async _getCapabilities() {
    const trigger = this.props.trigger;

    const capabilities = trigger.domain
      ? await fetchDeviceTriggerCapabilities(this.props.hass, trigger)
      : null;
    this.setState({ ...this.state, capabilities });
  }

  private _extraFieldsChanged(ev) {
    this.props.onChange(this.props.index, {
      ...this.props.trigger,
      ...ev.detail.value,
    });
  }

  private _extraFieldsComputeLabelCallback(localize) {
    // Returns a callback for ha-form to calculate labels per schema object
    return (schema) =>
      localize(
        `ui.panel.config.automation.editor.triggers.type.device.extra_fields.${schema.name}`
      ) || schema.name;
  }
}

(DeviceTrigger as any).defaultConfig = {
  device_id: "",
  domain: "",
  entity_id: "",
};
