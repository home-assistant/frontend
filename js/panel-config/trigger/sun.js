import { h, Component } from 'preact';

import { onChangeEvent } from '../../common/util/event.js';

export default class SunTrigger extends Component {
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
    const { offset, event } = trigger;
    return (
      <div>
        <label id="eventlabel">Event:</label>
        <paper-radio-group
          selected={event}
          aria-labelledby="eventlabel"
          onpaper-radio-group-changed={this.radioGroupPicked}
        >
          <paper-radio-button name="sunrise">Sunrise</paper-radio-button>
          <paper-radio-button name="sunset">Sunset</paper-radio-button>
        </paper-radio-group>

        <paper-input
          label="Offset (optional)"
          name="offset"
          value={offset}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

SunTrigger.defaultConfig = {
  event: 'sunrise',
};
