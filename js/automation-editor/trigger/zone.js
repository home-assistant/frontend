import { h, Component } from 'preact';

import { onChangeEvent } from '../../common/util/event';

export default class ZoneTrigger extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'trigger');
    this.radioGroupPicked = this.radioGroupPicked.bind(this);
  }

  radioGroupPicked(ev) {
    this.props.onChange(this.props.index, {
      ...this.props.trigger,
      event: ev.target.selected,
    });
  }

  /* eslint-disable camelcase */
  render({ trigger }) {
    const { entity_id, zone, event } = trigger;
    return (
      <div>
        <paper-input
          label="Entity Id"
          name="entity_id"
          value={entity_id}
          onChange={this.onChange}
        />
        <paper-input
          label="Zone"
          name="zone"
          value={zone}
          onChange={this.onChange}
        />
        <label id="eventlabel">Event:</label>
        <paper-radio-group
          selected={event}
          aria-labelledby="eventlabel"
          onpaper-radio-group-changed={this.radioGroupPicked}
        >
          <paper-radio-button name="enter">Enter</paper-radio-button>
          <paper-radio-button name="leave">Leave</paper-radio-button>
        </paper-radio-group>
      </div>
    );
  }
}

ZoneTrigger.defaultConfig = {
  entity_id: '',
  zone: '',
  event: 'enter',
};
