import { h, Component } from 'preact';

import { onChangeEvent } from '../../common/util/event';

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
          onChange={this.onChange}
        />
        <paper-input
          label="Payload (Optional)"
          name="payload"
          value={payload}
          onChange={this.onChange}
        />
      </div>
    );
  }
}

MQTTTrigger.defaultConfig = {
  topic: ''
};
