import { h, Component } from "preact";

import "../../../../components/device/ha-device-picker";
import "../../../../components/device/ha-device-trigger-picker";
import "../../../../components/paper-time-input.js";
// tslint:disable-next-line:no-duplicate-imports
import { PaperTimeInput } from "../../../../components/paper-time-input.js";

export default class DeviceTrigger extends Component<any, any> {
  constructor() {
    super();
    this.devicePicked = this.devicePicked.bind(this);
    this.deviceTriggerPicked = this.deviceTriggerPicked.bind(this);
    this.durationChanged = this.durationChanged.bind(this);
    this.state = { device_id: undefined };
  }

  public devicePicked(ev) {
    this.setState({ device_id: ev.target.value });
  }

  public deviceTriggerPicked(ev) {
    const trgFor = this.props.trigger.for;
    let deviceTrigger = ev.target.value;
    const showFor = deviceTrigger.hasOwnProperty("for");
    if (showFor) {
      deviceTrigger = { ...deviceTrigger, for: trgFor };
      // deviceTrigger = Object.assign(
      //  {},
      //  deviceTrigger, { for: trgFor }
      // );
    }
    this.props.onChange(this.props.index, deviceTrigger);
  }

  public durationChanged(ev) {
    if (!this.props.trigger.hasOwnProperty("for")) {
      return;
    }
    const duration = ev.detail.value;
    this.props.onChange(
      this.props.index,
      // Object.assign({}, this.props.trigger, { for: duration })
      { ...this.props.trigger, for: duration }
    );
  }

  /* eslint-disable camelcase */
  public render({ trigger, hass }, { device_id }) {
    if (device_id === undefined) {
      device_id = trigger.device_id;
    }
    const showFor = trigger.hasOwnProperty("for");
    const trgFor = trigger.for;
    let hours = "00";
    let minutes = "00";
    let seconds = "00";

    if (trgFor && (trgFor.hours || trgFor.minutes || trgFor.seconds)) {
      // If the trigger was defined using the yaml dict syntax, extract hours, minutes and seconds
      ({ hours = "00", minutes = "00", seconds = "00" } = trgFor);
    }
    if (typeof trgFor === "string" && trgFor.includes(":")) {
      // Parse hours, minutes and seconds from ':'-delimited string
      [hours = "00", minutes = "00", seconds = "00"] = trgFor.split(":");
    }
    // Convert to zero-padded string for display
    hours = parseInt(hours, 10)
      .toString()
      .padStart(2, "0");
    minutes = parseInt(minutes, 10)
      .toString()
      .padStart(2, "0");
    seconds = parseInt(seconds, 10)
      .toString()
      .padStart(2, "0");

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
        <paper-time-input
          label={hass.localize(
            "ui.panel.config.automation.editor.triggers.type.state.for"
          )}
          name="for"
          hour={hours}
          min={minutes}
          sec={seconds}
          enable-second
          format={24}
          onvalue-changed={this.durationChanged}
          hidden={!showFor}
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
