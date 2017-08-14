import { h, Component } from 'preact';

import { onChangeEvent } from '../util';

export default class StateCondition extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'condition');
  }

  /* eslint-disable camelcase */
  render({ condition }) {
    const { after, before } = condition;
    return (
      <div>
        <paper-input
          label="After"
          name="after"
          value={after}
          onChange={this.onChange}
        />
        <paper-input
          label="Before"
          name="before"
          value={before}
          onChange={this.onChange}
        />
      </div>
    );
  }
}

StateCondition.defaultConfig = {
  after: '',
  before: '',
};
