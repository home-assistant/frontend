import { h, Component } from 'preact';

import JSONTextArea from '../json_textarea.js';
import { onChangeEvent } from '../../common/util/event.js';

export default class EventAction extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'action');
    this.serviceDataChanged = this.serviceDataChanged.bind(this);
  }

  serviceDataChanged(data) {
    this.props.onChange(this.props.index, {
      ...this.props.action,
      data,
    });
  }

  render({ action }) {
    /* eslint-disable camelcase */
    const { event, event_data } = action;
    return (
      <div>
        <paper-input
          label="Event"
          name="event"
          value={event}
          onvalue-changed={this.onChange}
        />
        <JSONTextArea
          label="Service Data"
          value={event_data}
          onChange={this.serviceDataChanged}
        />
      </div>
    );
  }
}

EventAction.configKey = 'event';
EventAction.defaultConfig = {
  event: '',
  event_data: {},
};
