import { h, Component } from 'preact';

import { onChangeEvent } from '../../common/util/event.js';

export default class NumericStateTrigger extends Component {
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
    const {
      value_template, entity_id, below, above
    } = trigger;

    return (
      <div>
        <ha-entity-picker
          value={entity_id}
          onChange={this.entityPicked}
          hass={hass}
          allowCustomEntity
        />
        <paper-input
          label="Above"
          name="above"
          value={above}
          onvalue-changed={this.onChange}
        />
        <paper-input
          label="Below"
          name="below"
          value={below}
          onvalue-changed={this.onChange}
        />
        <paper-textarea
          label="Value template (optional)"
          name="value_template"
          value={value_template}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

NumericStateTrigger.defaultConfig = {
  entity_id: '',
};
