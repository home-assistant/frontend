import { h, Component } from 'preact';

import { onChangeEvent } from '../../common/util/event.js';

export default class TemplateCondition extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'condition');
  }

  render({ condition }) {
    /* eslint-disable camelcase */
    const { value_template } = condition;
    return (
      <div>
        <paper-textarea
          label="Value Template"
          name="value_template"
          value={value_template}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

TemplateCondition.defaultConfig = {
  value_template: '',
};
