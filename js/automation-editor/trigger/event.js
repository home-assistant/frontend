import { h, Component } from 'preact';

import JSONTextArea from '../../common/component/json_textarea';

import { onChangeEvent } from '../../common/util/event';

export default class EventTrigger extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'trigger');
    this.eventDataChanged = this.eventDataChanged.bind(this);
  }

  /* eslint-disable camelcase */
  eventDataChanged(event_data) {
    this.props.onChange(this.props.index, {
      ...this.props.trigger,
      event_data,
    });
  }

  render({ trigger }) {
    const { event_type, event_data } = trigger;
    return (
      <div>
        <paper-input
          label="Event Type"
          name="event_type"
          value={event_type}
          onChange={this.onChange}
        />
        <JSONTextArea
          label="Event Data"
          value={event_data}
          onChange={this.eventDataChanged}
        />
      </div>
    );
  }
}

EventTrigger.defaultConfig = {
  event_type: '',
  event_data: {},
};
