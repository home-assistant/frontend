import { h } from "preact";

import "@polymer/paper-input/paper-input";
import "../../../../components/ha-textarea";

import "../../../../components/entity/ha-entity-picker";

import { onChangeEvent } from "../../../../common/preact/event";
import { AutomationComponent } from "../automation-component";

export default class NumericStateTrigger extends AutomationComponent<any> {
  private onChange: (obj: any) => void;
  constructor(props) {
    super(props);

    this.onChange = onChangeEvent.bind(this, "trigger");
    this.entityPicked = this.entityPicked.bind(this);
  }

  public entityPicked(ev) {
    this.props.onChange(this.props.index, {
      ...this.props.trigger,
      entity_id: ev.target.value,
    });
  }

  /* eslint-disable camelcase */
  public render({ trigger, hass, localize }) {
    const { value_template, entity_id, below, above } = trigger;
    let trgFor = trigger.for;

    if (trgFor && (trgFor.hours || trgFor.minutes || trgFor.seconds)) {
      // If the trigger was defined using the yaml dict syntax, convert it to
      // the equivalent string format
      let { hours = 0, minutes = 0, seconds = 0 } = trgFor;
      hours = hours.toString();
      minutes = minutes.toString().padStart(2, "0");
      seconds = seconds.toString().padStart(2, "0");

      trgFor = `${hours}:${minutes}:${seconds}`;
    }
    return (
      <div>
        <ha-entity-picker
          value={entity_id}
          onChange={this.entityPicked}
          hass={hass}
          allowCustomEntity
        />
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.numeric_state.above"
          )}
          name="above"
          value={above}
          onvalue-changed={this.onChange}
        />
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.numeric_state.below"
          )}
          name="below"
          value={below}
          onvalue-changed={this.onChange}
        />
        <ha-textarea
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.numeric_state.value_template"
          )}
          name="value_template"
          value={value_template}
          onvalue-changed={this.onChange}
          dir="ltr"
        />
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.state.for"
          )}
          name="for"
          value={trgFor}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

(NumericStateTrigger as any).defaultConfig = {
  entity_id: "",
};
