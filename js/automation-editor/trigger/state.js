import { h, Component } from 'preact';

import { onChangeEvent } from '../../common/util/event';

export default class StateTrigger extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'trigger');
  }

  /* eslint-disable camelcase */
  render({ trigger }) {
    const { entity_id, to } = trigger;
    const trgFrom = trigger.from;
    const trgFor = trigger.for;
    return (
      <div>
        <paper-input
          label="Entity Id"
          name="entity_id"
          value={entity_id}
          onChange={this.onChange}
        />
        <paper-input
          label="From"
          name="from"
          value={trgFrom}
          onChange={this.onChange}
        />
        <paper-input
          label="To"
          name="to"
          value={to}
          onChange={this.onChange}
        />
        {trgFor && <pre>For: {JSON.stringify(trgFor, null, 2)}</pre>}
      </div>
    );
  }
}

StateTrigger.defaultConfig = {
  entity_id: '',
};
