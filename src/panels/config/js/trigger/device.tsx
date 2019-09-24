import { h, Component } from "preact";

import "../../../../components/device/ha-device-picker";
import "../../../../components/device/ha-device-trigger-picker";
import "../../../../components/paper-time-input";

import { onChangeEvent } from "../../../../common/preact/event";

export default class DeviceTrigger extends Component<any, any> {
  private onChange: (obj: any) => void;
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "trigger");
    this.daysChanged = this.daysChanged.bind(this);
    this.devicePicked = this.devicePicked.bind(this);
    this.deviceTriggerPicked = this.deviceTriggerPicked.bind(this);
    this.timeChanged = this.timeChanged.bind(this);
    this.state = { device_id: undefined };
  }

  public devicePicked(ev) {
    this.setState({ device_id: ev.target.value });
  }

  public deviceTriggerPicked(ev) {
    let deviceTrigger = ev.target.value;
    this.props.onChange(this.props.index, deviceTrigger);
  }

  private daysChanged(ev) {
    const showFor = this.props.trigger.supports && this.props.trigger.supports.includes("for");
    if (!showFor) {
      return;
    }
    const days = ev.detail.value || 0;
    let duration = this._parseTime(this.props.trigger.for);
    duration = {
      ...duration,
      hours: (parseInt(duration.hours%24,10) + parseInt(days, 10)*24).toString(),
    };

    this.props.onChange(this.props.index, {
      ...this.props.trigger,
      for: duration,
    });
    console.log(this.props.trigger)
  }

  private timeChanged(ev) {
    const showFor = this.props.trigger.supports && this.props.trigger.supports.includes("for");
    if (!showFor) {
      return;
    }
    const days = Math.floor(parseInt(this._parseTime(this.props.trigger.for).hours/24, 10);
    let duration = this._parseTime(ev.detail.value);
    duration = {
      ...duration,
      hours: (parseInt(duration.hours,10) + days*24).toString(),
    };
    this.props.onChange(this.props.index, {
      ...this.props.trigger,
      for: duration,
    });
  }

  /* eslint-disable camelcase */
  public render({ trigger, hass }, { device_id }) {
    if (device_id === undefined) {
      device_id = trigger.device_id;
    }
    const stateObj = trigger.entity_id && hass.states[trigger.entity_id];
    const showFor = trigger.supports && trigger.supports.includes("for");
    const trgFor = trigger.for;
    let { hours, minutes, seconds } = this._parseTime(trgFor);
    let days = Math.floor(parseInt(hours, 10)/24).toString();
    hours = (parseInt(hours, 10)%24).toString();
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
        {showFor && (
          <div
          >
          <paper-input
            label="days"
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
            onvalue-changed={this.timeChanged}
          />
          </div>
        )}
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
}

(DeviceTrigger as any).defaultConfig = {
  device_id: "",
  domain: "",
  entity_id: "",
};
