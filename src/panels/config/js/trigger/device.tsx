import { h, Component } from "preact";

import "../../../../components/device/ha-device-picker";
import "../../../../components/device/ha-device-trigger-picker";
import "../../../../components/paper-time-input";

import { onChangeEvent } from "../../../../common/preact/event";

import { fetchDeviceTriggerCapabilities } from "../../../../data/device_automation";

export default class DeviceTrigger extends Component<any, any> {
  private onChange: (obj: any) => void;
  private hass;
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "trigger");
    this.daysChanged = this.daysChanged.bind(this);
    this.hoursChanged = this.hoursChanged.bind(this);
    this.minutesChanged = this.minutesChanged.bind(this);
    this.secondsChanged = this.secondsChanged.bind(this);
    this.devicePicked = this.devicePicked.bind(this);
    this.deviceTriggerPicked = this.deviceTriggerPicked.bind(this);
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

  public daysChanged(ev) {
    this._timeChanged(ev, "days");
  }

  public hoursChanged(ev) {
    this._timeChanged(ev, "hours");
  }

  public minutesChanged(ev) {
    this._timeChanged(ev, "minutes");
  }

  public secondsChanged(ev) {
    this._timeChanged(ev, "seconds");
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
    const showFor =
      this.state.capabilities &&
      this.state.capabilities.supports &&
      this.state.capabilities.supports.includes("for");
    const trgFor = trigger.for;
    let { days, hours, minutes, seconds } = this._parseTime(trgFor);
    days = days.toString();
    hours = this._pad(hours.toString());
    minutes = this._pad(minutes.toString());
    seconds = this._pad(seconds.toString());

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
        {showFor && (
          <div>
            <paper-input
              id="device-trigger-days"
              label="Days"
              name="days"
              type="number"
              value={days}
              onvalue-changed={this.daysChanged}
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
              onhour-changed={this.hoursChanged}
              onmin-changed={this.minutesChanged}
              onsec-changed={this.secondsChanged}
            />
          </div>
        )}
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
    let days = "0";
    let hours = "00";
    let minutes = "00";
    let seconds = "00";
    if (trgFor && (trgFor.hours || trgFor.minutes || trgFor.seconds)) {
      // If the trigger was defined using the yaml dict syntax, extract days, hours, minutes and seconds
      ({ days = "0", hours = "00", minutes = "00", seconds = "00" } = trgFor);
    }
    if (typeof trgFor === "string" && trgFor.includes(":")) {
      // Parse hours, minutes and seconds from ':'-delimited string
      [hours = "00", minutes = "00", seconds = "00"] = trgFor.split(":");
    }
    return { days, hours, minutes, seconds };
  }

  private _timeChanged(ev, unit) {
    const showFor =
      this.state.capabilities &&
      this.state.capabilities.supports &&
      this.state.capabilities.supports.includes("for");
    if (!showFor) {
      return;
    }
    const value = ev.detail.value || 0;
    const duration = {
      ...this._parseTime(this.props.trigger.for),
      [unit]: value,
    };
    this.props.onChange(this.props.index, {
      ...this.props.trigger,
      for: duration,
    });
  }
}

(DeviceTrigger as any).defaultConfig = {
  device_id: "",
  domain: "",
  entity_id: "",
};
