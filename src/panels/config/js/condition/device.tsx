import { h, Component } from "preact";

import "../../../../components/device/ha-device-picker";
import "../../../../components/device/ha-device-condition-picker";
import "../../../../components/ha-form";

import {
  fetchDeviceConditionCapabilities,
  deviceAutomationsEqual,
} from "../../../../data/device_automation";
export default class DeviceCondition extends Component<any, any> {
  private _origCondition;

  constructor() {
    super();
    this.devicePicked = this.devicePicked.bind(this);
    this.deviceConditionPicked = this.deviceConditionPicked.bind(this);
    this._extraFieldsChanged = this._extraFieldsChanged.bind(this);
    this.state = { device_id: undefined, capabilities: undefined };
  }

  public devicePicked(ev) {
    this.setState({ ...this.state, device_id: ev.target.value });
  }

  public deviceConditionPicked(ev) {
    let condition = ev.target.value;
    if (
      this._origCondition &&
      deviceAutomationsEqual(this._origCondition, condition)
    ) {
      condition = this._origCondition;
    }
    this.props.onChange(this.props.index, condition);
  }

  /* eslint-disable camelcase */
  public render({ condition, hass }, { device_id, capabilities }) {
    if (device_id === undefined) {
      device_id = condition.device_id;
    }
    const extraFieldsData =
      capabilities && capabilities.extra_fields
        ? capabilities.extra_fields.map((item) => {
            return { [item.name]: this.props.condition[item.name] };
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
        <ha-device-condition-picker
          value={condition}
          deviceId={device_id}
          onChange={this.deviceConditionPicked}
          hass={hass}
          label="Condition"
        />
        {extraFieldsData && (
          <ha-form
            data={Object.assign({}, ...extraFieldsData)}
            onData-changed={this._extraFieldsChanged}
            schema={this.state.capabilities.extra_fields}
            computeLabel={this._extraFieldsComputeLabelCallback(hass.localize)}
          />
        )}
      </div>
    );
  }

  public componentDidMount() {
    if (!this.state.capabilities) {
      this._getCapabilities();
    }
    if (this.props.condition) {
      this._origCondition = this.props.condition;
    }
  }

  public componentDidUpdate(prevProps) {
    if (!deviceAutomationsEqual(prevProps.condition, this.props.condition)) {
      this._getCapabilities();
    }
  }

  private async _getCapabilities() {
    const condition = this.props.condition;

    const capabilities = condition.domain
      ? await fetchDeviceConditionCapabilities(this.props.hass, condition)
      : null;
    this.setState({ ...this.state, capabilities });
  }

  private _extraFieldsChanged(ev) {
    if (!ev.detail.path) {
      return;
    }
    const item = ev.detail.path.replace("data.", "");
    const value = ev.detail.value || undefined;

    this.props.onChange(this.props.index, {
      ...this.props.condition,
      [item]: value,
    });
  }

  private _extraFieldsComputeLabelCallback(localize) {
    // Returns a callback for ha-form to calculate labels per schema object
    return (schema) =>
      localize(
        `ui.panel.config.automation.editor.condition.type.device.extra_fields.${
          schema.name
        }`
      ) || schema.name;
  }
}

(DeviceCondition as any).defaultConfig = {
  device_id: "",
  domain: "",
  entity_id: "",
};
