import { h, Component } from 'preact';
import '@polymer/paper-input/paper-input.js';

import JSONTextArea from '../json_textarea.js';
import { onChangeEvent } from '../../../../common/preact/event.js';

export default class EventTrigger extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'trigger');
    this.eventDataChanged = this.eventDataChanged.bind(this);
  }

  /* eslint-disable camelcase */
  eventDataChanged(event_data) {
    this.props.onChange(this.props.index, Object.assign(
      {}, this.props.trigger,
      { event_data },
    ));
  }

  render({ trigger, localize }) {
    const { event_type, event_data } = trigger;
    return (
      <div>
        <paper-input
          label={localize('ui.panel.config.automation.editor.triggers.type.event.event_type')}
          name="event_type"
          value={event_type}
          onvalue-changed={this.onChange}
        />
        <JSONTextArea
          label={localize('ui.panel.config.automation.editor.triggers.type.event.event_data')}
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
