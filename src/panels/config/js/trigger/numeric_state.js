import { h, Component } from "preact";
import "@polymer/paper-input/paper-input";
import "../../../../components/ha-textarea";

import "../../../../components/entity/ha-entity-picker";

import { onChangeEvent } from "../../../../common/preact/event";

export default class NumericStateTrigger extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "trigger");
    this.entityPicked = this.entityPicked.bind(this);
  }

  entityPicked(ev) {
    this.props.onChange(
      this.props.index,
      Object.assign({}, this.props.trigger, { entity_id: ev.target.value })
    );
  }

  /* eslint-disable camelcase */
  render({ trigger, hass, localize }) {
    const { value_template, entity_id, below, above } = trigger;

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
        />
      </div>
    );
  }
}

NumericStateTrigger.defaultConfig = {
  entity_id: "",
};
