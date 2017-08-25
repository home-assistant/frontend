import { h, Component } from 'preact';

import { onChangeEvent } from '../../common/util/event';

export default class TimeTrigger extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'trigger');
  }

  /* eslint-disable camelcase */
  render({ trigger }) {
    const { at } = trigger;
    return (
      <div>
        <paper-input
          label="At"
          name="at"
          value={at}
          onChange={this.onChange}
        />
      </div>
    );
  }
}

TimeTrigger.defaultConfig = {
  at: '',
};
