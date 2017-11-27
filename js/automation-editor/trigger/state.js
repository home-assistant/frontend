import { h, Component } from 'preact';

import { onChangeEvent } from '../../common/util/event.js';

export default class StateTrigger extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'trigger');
    this.entityPicked = this.entityPicked.bind(this);
  }

  entityPicked(ev) {
    this.props.onChange(this.props.index, {
      ...this.props.trigger,
      entity_id: ev.target.value,
    });
  }

  /* eslint-disable camelcase */
  render({ trigger, hass }) {
    const { entity_id, to } = trigger;
    const trgFrom = trigger.from;
    const trgFor = trigger.for;
    return (
      <div>
        <ha-entity-picker
          value={entity_id}
          onChange={this.entityPicked}
          hass={hass}
          allowCustomEntity
        />
        <paper-input
          label="From"
          name="from"
          value={trgFrom}
          onvalue-changed={this.onChange}
        />
        <paper-input
          label="To"
          name="to"
          value={to}
          onvalue-changed={this.onChange}
        />
        {trgFor && <pre>For: {JSON.stringify(trgFor, null, 2)}</pre>}
      </div>
    );
  }
}

StateTrigger.defaultConfig = {
  entity_id: '',
};
