import { h, Component } from 'preact';

import TriggerRow from './trigger_row.js';
import StateTrigger from './state.js';

export default class Trigger extends Component {
  constructor() {
    super();

    this.addTrigger = this.addTrigger.bind(this);
    this.triggerChanged = this.triggerChanged.bind(this);
  }

  addTrigger() {
    const trigger = this.props.trigger.concat({
      platform: 'state',
      ...StateTrigger.defaultConfig,
    });

    this.props.onChange(trigger);
  }

  triggerChanged(index, newValue) {
    const trigger = this.props.trigger.concat();

    if (newValue === null) {
      trigger.splice(index, 1);
    } else {
      trigger[index] = newValue;
    }

    this.props.onChange(trigger);
  }

  render({ trigger, hass }) {
    return (
      <div class="triggers">
        {trigger.map((trg, idx) => (
          <TriggerRow
            index={idx}
            trigger={trg}
            onChange={this.triggerChanged}
            hass={hass}
          />))}
        <paper-card>
          <div class='card-actions add-card'>
            <paper-button onTap={this.addTrigger}>Add trigger</paper-button>
          </div>
        </paper-card>
      </div>
    );
  }
}
