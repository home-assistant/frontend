import { h, Component } from 'preact';

import '@polymer/paper-input/paper-input.js';

import { onChangeEvent } from '../../../../common/preact/event.js';

export default class TimeTrigger extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'trigger');
  }

  /* eslint-disable camelcase */
  render({ trigger, localize }) {
    const { at, hours, minutes, seconds } = trigger;
    return (
      <div>
        <paper-input
          label={localize('ui.panel.config.automation.editor.triggers.type.time.at')}
          name="at"
          value={at}
          onvalue-changed={this.onChange}
        />
        <paper-input
          label={localize('ui.panel.config.automation.editor.triggers.type.time.hours')}
          name="hours"
          value={hours}
          onvalue-changed={this.onChange}
        />
        <paper-input
          label={localize('ui.panel.config.automation.editor.triggers.type.time.minutes')}
          name="minutes"
          value={minutes}
          onvalue-changed={this.onChange}
        />
        <paper-input
          label={localize('ui.panel.config.automation.editor.triggers.type.time.seconds')}
          name="seconds"
          value={seconds}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

TimeTrigger.defaultConfig = {
  at: '',
};
