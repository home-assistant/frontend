import { h, Component } from 'preact';

import { onChangeEvent } from '../../common/util/event.js';

export default class TemplateTrigger extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'trigger');
  }

  render({ trigger }) {
    /* eslint-disable camelcase */
    const { value_template } = trigger;
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

TemplateTrigger.defaultConfig = {
  value_template: '',
};
