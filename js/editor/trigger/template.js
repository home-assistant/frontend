import { h, Component } from 'preact';

import { onChange } from './util';

export default class TemplateTrigger extends Component {
  constructor() {
    super();

    this.onChange = onChange.bind(this);
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
