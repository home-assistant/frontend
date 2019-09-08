import { h, Component } from "preact";
import "@material/mwc-button";
import "../../../../components/ha-card";

import TriggerRow from "./trigger_row";
import StateTrigger from "./state";

export default class Trigger extends Component<any> {
  constructor() {
    super();

    this.addTrigger = this.addTrigger.bind(this);
    this.triggerChanged = this.triggerChanged.bind(this);
  }

  public addTrigger() {
    const trigger = this.props.trigger.concat({
      platform: "state",
      ...(StateTrigger as any).defaultConfig,
    });

    this.props.onChange(trigger);
  }

  public triggerChanged(index, newValue) {
    const trigger = this.props.trigger.concat();

    if (newValue === null) {
      trigger.splice(index, 1);
    } else {
      trigger[index] = newValue;
    }

    this.props.onChange(trigger);
  }

  public render({ trigger, hass, localize }) {
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
        <ha-card>
          <div class="card-actions add-card">
            <mwc-button onTap={this.addTrigger}>
              {localize("ui.panel.config.automation.editor.triggers.add")}
            </mwc-button>
          </div>
        </ha-card>
      </div>
    );
  }
}
