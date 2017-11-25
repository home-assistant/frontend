import { h, Component } from 'preact';

import EventTrigger from './event.js';
import HassTrigger from './homeassistant.js';
import MQTTTrigger from './mqtt.js';
import NumericStateTrigger from './numeric_state.js';
import StateTrigger from './state.js';
import SunTrigger from './sun.js';
import TemplateTrigger from './template.js';
import TimeTrigger from './time.js';
import ZoneTrigger from './zone.js';

const TYPES = {
  event: EventTrigger,
  state: StateTrigger,
  homeassistant: HassTrigger,
  mqtt: MQTTTrigger,
  numeric_state: NumericStateTrigger,
  sun: SunTrigger,
  template: TemplateTrigger,
  time: TimeTrigger,
  zone: ZoneTrigger,
};

const OPTIONS = Object.keys(TYPES).sort();

export default class TriggerEdit extends Component {
  constructor() {
    super();

    this.typeChanged = this.typeChanged.bind(this);
  }

  typeChanged(ev) {
    const type = ev.target.selectedItem.innerHTML;

    if (type !== this.props.trigger.platform) {
      this.props.onChange(this.props.index, {
        platform: type,
        ...TYPES[type].defaultConfig
      });
    }
  }

  render({ index, trigger, onChange, hass }) {
    const Comp = TYPES[trigger.platform];
    const selected = OPTIONS.indexOf(trigger.platform);

    if (!Comp) {
      return (
        <div>
          Unsupported platform: {trigger.platform}
          <pre>{JSON.stringify(trigger, null, 2)}</pre>
        </div>
      );
    }
    return (
      <div>
        <paper-dropdown-menu-light label="Trigger Type" no-animations>
          <paper-listbox
            slot="dropdown-content"
            selected={selected}
            oniron-select={this.typeChanged}
          >
            {OPTIONS.map(opt => <paper-item>{opt}</paper-item>)}
          </paper-listbox>
        </paper-dropdown-menu-light>
        <Comp
          index={index}
          trigger={trigger}
          onChange={onChange}
          hass={hass}
        />
      </div>
    );
  }
}
