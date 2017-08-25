import { h, Component } from 'preact';

import { onChangeEvent } from '../../util/event';

export default class StateCondition extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'condition');
  }

  /* eslint-disable camelcase */
  render({ condition }) {
    const { entity_id, state } = condition;
    const cndFor = condition.for;
    return (
      <div>
        <paper-input
          label="Entity Id"
          name="entity_id"
          value={entity_id}
          onChange={this.onChange}
        />
        <paper-input
          label="State"
          name="state"
          value={state}
          onChange={this.onChange}
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
