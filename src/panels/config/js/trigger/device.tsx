import { h, Component } from "preact";

import "../../../../components/device/ha-device-picker";
import "../../../../components/device/ha-device-trigger-picker";
import "../../../../components/paper-time-input.js";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "paper-time-input": any;
    }
  }
}

export default class DeviceTrigger extends Component<any, any> {
  constructor() {
    super();
    this.devicePicked = this.devicePicked.bind(this);
    this.deviceTriggerPicked = this.deviceTriggerPicked.bind(this);
    this.hourChanged = this.hourChanged.bind(this);
    this.minuteChanged = this.minuteChanged.bind(this);
    this.secondChanged = this.secondChanged.bind(this);
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
    }
    this.props.onChange(this.props.index, deviceTrigger);
  }

  public hourChanged(ev) {
    this._timeChanged(ev, "hours");
  }

  public minuteChanged(ev) {
    this._timeChanged(ev, "minutes");
  }

  public secondChanged(ev) {
    this._timeChanged(ev, "seconds");
  }

  /* eslint-disable camelcase */
  public render({ trigger, hass }, { device_id }) {
    if (device_id === undefined) {
      device_id = trigger.device_id;
    }
    const showFor = trigger.hasOwnProperty("for");
    const trgFor = trigger.for;
    let { hours, minutes, seconds } = this._parseTime(trgFor);
    hours = this._pad(hours);
    minutes = this._pad(minutes);
    seconds = this._pad(seconds);

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
          hour={hours}
          min={minutes}
          sec={seconds}
          enable-second
          format={24}
          onhour-changed={this.hourChanged}
          onmin-changed={this.minuteChanged}
          onsec-changed={this.secondChanged}
          hidden={!showFor}
        />
      </div>
    );
  }

  private _pad(value) {
    // Convert to zero-padded string for display
    return parseInt(value, 10)
      .toString()
      .padStart(2, "0");
  }

  private _parseTime(trgFor) {
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
    return { hours, minutes, seconds };
  }

  private _formatTime({ hours, minutes, seconds }) {
    hours = this._pad(hours);
    minutes = this._pad(minutes);
    seconds = this._pad(seconds);
    return hours + ":" + minutes + ":" + seconds;
  }

  private _timeChanged(ev, unit) {
    if (!this.props.trigger.hasOwnProperty("for")) {
      return;
    }
    const value = ev.detail.value || 0;
    const duration = {
      ...this._parseTime(this.props.trigger.for),
      [unit]: value,
    };
    this.props.onChange(this.props.index, {
      ...this.props.trigger,
      for: this._formatTime(duration),
    });
  }
}

(DeviceTrigger as any).defaultConfig = {
  device_id: "",
  domain: "",
  entity_id: "",
};
