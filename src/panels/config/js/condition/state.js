import { h, Component } from "preact";
import "@polymer/paper-input/paper-input";
import "../../../../components/entity/ha-entity-picker";

import { onChangeEvent } from "../../../../common/preact/event";

export default class StateCondition extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "condition");
    this.entityPicked = this.entityPicked.bind(this);
  }

  entityPicked(ev) {
    this.props.onChange(
      this.props.index,
      Object.assign({}, this.props.condition, { entity_id: ev.target.value })
    );
  }

  /* eslint-disable camelcase */
  render({ condition, hass, localize }) {
    const { entity_id, state } = condition;
    const cndFor = condition.for;
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
            "ui.panel.config.automation.editor.conditions.type.state.state"
          )}
          name="state"
          value={state}
          onvalue-changed={this.onChange}
        />
        {cndFor && <pre>For: {JSON.stringify(cndFor, null, 2)}</pre>}
      </div>
    );
  }
}

StateCondition.defaultConfig = {
  entity_id: "",
  state: "",
};
