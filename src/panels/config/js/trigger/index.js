import { h, Component } from "preact";
import "@polymer/paper-card/paper-card";
import "@material/mwc-button";

import TriggerRow from "./trigger_row";
import StateTrigger from "./state";

export default class Trigger extends Component {
  constructor() {
    super();

    this.addTrigger = this.addTrigger.bind(this);
    this.triggerChanged = this.triggerChanged.bind(this);
  }

  addTrigger() {
    const trigger = this.props.trigger.concat(
      Object.assign({ platform: "state" }, StateTrigger.defaultConfig)
    );

    this.props.onChange(trigger);
  }

  triggerChanged(index, newValue) {
    const trigger = this.props.trigger.concat();

    if (newValue === null) {
      trigger.splice(index, 1);
    } else {
      trigger[index] = newValue;
    }

    this.props.onChange(trigger);
  }

  render({ trigger, hass, localize }) {
    return (
      <div class="triggers">
        {trigger.map((trg, idx) => (
          <TriggerRow
            index={idx}
            trigger={trg}
            onChange={this.triggerChanged}
            hass={hass}
            localize={localize}
          />
        ))}
        <paper-card>
          <div class="card-actions add-card">
            <mwc-button onTap={this.addTrigger}>
              {localize("ui.panel.config.automation.editor.triggers.add")}
            </mwc-button>
          </div>
        </paper-card>
      </div>
    );
  }
}
