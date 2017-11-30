import { h, Component } from 'preact';

import { onChangeEvent } from '../../common/util/event.js';

export default class StateCondition extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'condition');
    this.entityPicked = this.entityPicked.bind(this);
  }

  entityPicked(ev) {
    this.props.onChange(this.props.index, {
      ...this.props.condition,
      entity_id: ev.target.value,
    });
  }

  /* eslint-disable camelcase */
  render({ condition, hass }) {
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
          label="State"
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
  entity_id: '',
  state: '',
};
