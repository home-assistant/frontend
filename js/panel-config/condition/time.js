import { h, Component } from 'preact';

import { onChangeEvent } from '../../common/util/event.js';

export default class TimeCondition extends Component {
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
          onvalue-changed={this.onChange}
        />
        <paper-input
          label="Before"
          name="before"
          value={before}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

TimeCondition.defaultConfig = {
};
