import { h, Component } from 'preact';

import { onChangeEvent } from '../../common/util/event';

export default class NumericStateTrigger extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'trigger');
  }

  /* eslint-disable camelcase */
  render({ trigger }) {
    const { value_template, entity_id, below, above } = trigger;
    return (
      <div>
        <paper-input
          label="Entity Id"
          name="entity_id"
          value={entity_id}
          onChange={this.onChange}
        />
        <paper-input
          label="Above"
          name="above"
          value={above}
          onChange={this.onChange}
        />
        <paper-input
          label="Below"
          name="below"
          value={below}
          onChange={this.onChange}
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
