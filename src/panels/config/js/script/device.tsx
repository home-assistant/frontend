import { h, Component } from "preact";

import "../../../../components/device/ha-device-picker";
import "../../../../components/device/ha-device-action-picker";
import "../../../../components/ha-form/ha-form";

import {
  fetchDeviceActionCapabilities,
  deviceAutomationsEqual,
} from "../../../../data/device_automation";
import { DeviceAction } from "../../../../data/script";
import { HomeAssistant } from "../../../../types";

export default class DeviceActionEditor extends Component<
  {
    index: number;
    action: DeviceAction;
    hass: HomeAssistant;
    onChange(index: number, action: DeviceAction);
  },
  {
    device_id: string | undefined;
    capabilities: any | undefined;
  }
> {
  public static defaultConfig: DeviceAction = {
    device_id: "",
    domain: "",
    entity_id: "",
  };

  private _origAction;

  constructor() {
    super();
    this.devicePicked = this.devicePicked.bind(this);
    this.deviceActionPicked = this.deviceActionPicked.bind(this);
    this._extraFieldsChanged = this._extraFieldsChanged.bind(this);
    this.state = { device_id: undefined, capabilities: undefined };
  }

  public render() {
    const { action, hass } = this.props;
    const deviceId = this.state.device_id || action.device_id;
    const capabilities = this.state.capabilities;
    const extraFieldsData =
      capabilities && capabilities.extra_fields
        ? capabilities.extra_fields.map((item) => {
            return { [item.name]: this.props.action[item.name] };
          })
        : undefined;

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
        {extraFieldsData && (
          <ha-form
            data={Object.assign({}, ...extraFieldsData)}
            onvalue-changed={this._extraFieldsChanged}
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
    if (this.props.action) {
      this._origAction = this.props.action;
    }
  }

  public componentDidUpdate(prevProps) {
    if (!deviceAutomationsEqual(prevProps.action, this.props.action)) {
      this._getCapabilities();
    }
  }

  private devicePicked(ev) {
    this.setState({ ...this.state, device_id: ev.target.value });
  }

  private deviceActionPicked(ev) {
    let deviceAction = ev.target.value;
    if (
      this._origAction &&
      deviceAutomationsEqual(this._origAction, deviceAction)
    ) {
      deviceAction = this._origAction;
    }
    this.props.onChange(this.props.index, deviceAction);
  }

  private async _getCapabilities() {
    const action = this.props.action;

    const capabilities = action.domain
      ? await fetchDeviceActionCapabilities(this.props.hass, action)
      : null;
    this.setState({ ...this.state, capabilities });
  }

  private _extraFieldsChanged(ev) {
    this.props.onChange(this.props.index, {
      ...this.props.action,
      ...ev.detail.value,
    });
  }

  private _extraFieldsComputeLabelCallback(localize) {
    // Returns a callback for ha-form to calculate labels per schema object
    return (schema) =>
      localize(
        `ui.panel.config.automation.editor.actions.type.device_id.extra_fields.${schema.name}`
      ) || schema.name;
  }
}
