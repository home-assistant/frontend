import { h, Component } from 'preact';

import { onChangeEvent } from '../../util/event';

export default class NumericStateCondition extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'condition');
  }

  /* eslint-disable camelcase */
  render({ condition }) {
    const { value_template, entity_id, below, above } = condition;
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

NumericStateCondition.defaultConfig = {
  entity_id: '',
};
