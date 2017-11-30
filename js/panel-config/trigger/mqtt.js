import { h, Component } from 'preact';

import { onChangeEvent } from '../../common/util/event.js';

export default class MQTTTrigger extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'trigger');
  }

  /* eslint-disable camelcase */
  render({ trigger }) {
    const { topic, payload } = trigger;
    return (
      <div>
        <paper-input
          label="Topic"
          name="topic"
          value={topic}
          onvalue-changed={this.onChange}
        />
        <paper-input
          label="Payload (Optional)"
          name="payload"
          value={payload}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

MQTTTrigger.defaultConfig = {
  topic: ''
};
