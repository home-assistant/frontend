import { h, Component } from 'preact';

import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-radio-button/paper-radio-button.js';
import '@polymer/paper-radio-group/paper-radio-group.js';

import { onChangeEvent } from '../../../../common/preact/event.js';

export default class SunTrigger extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'trigger');
    this.radioGroupPicked = this.radioGroupPicked.bind(this);
  }

  radioGroupPicked(ev) {
    this.props.onChange(this.props.index, Object.assign(
      {}, this.props.trigger,
      { event: ev.target.selected },
    ));
  }

  /* eslint-disable camelcase */
  render({ trigger, localize }) {
    const { offset, event } = trigger;
    return (
      <div>
        <label id="eventlabel">{localize('ui.panel.config.automation.editor.triggers.type.sun.event')}</label>
        <paper-radio-group
          selected={event}
          aria-labelledby="eventlabel"
          onpaper-radio-group-changed={this.radioGroupPicked}
        >
          <paper-radio-button name="sunrise">{localize('ui.panel.config.automation.editor.triggers.type.sun.sunrise')}</paper-radio-button>
          <paper-radio-button name="sunset">{localize('ui.panel.config.automation.editor.triggers.type.sun.sunset')}</paper-radio-button>
        </paper-radio-group>

        <paper-input
          label={localize('ui.panel.config.automation.editor.triggers.type.sun.offset')}
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
