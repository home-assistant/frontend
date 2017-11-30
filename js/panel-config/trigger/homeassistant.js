import { h, Component } from 'preact';

export default class HassTrigger extends Component {
  constructor() {
    super();

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
    const { event } = trigger;
    return (
      <div>
        <label id="eventlabel">Event:</label>
        <paper-radio-group
          selected={event}
          aria-labelledby="eventlabel"
          onpaper-radio-group-changed={this.radioGroupPicked}
        >
          <paper-radio-button name="start">Start</paper-radio-button>
          <paper-radio-button name="shutdown">Shutdown</paper-radio-button>
        </paper-radio-group>
      </div>
    );
  }
}

HassTrigger.defaultConfig = {
  event: 'start'
};
