import { h, Component } from 'preact';

import CallServiceAction from './call_service.js';
import ConditionAction from './condition.js';
import DelayAction from './delay.js';
import EventAction from './event.js';
import WaitAction from './wait.js';

const TYPES = {
  service: CallServiceAction,
  delay: DelayAction,
  wait_template: WaitAction,
  condition: ConditionAction,
  event: EventAction,
};

const OPTIONS = Object.keys(TYPES).sort();

function getType(action) {
  const keys = Object.keys(TYPES);
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] in action) {
      return keys[i];
    }
  }
  return null;
}

export default class Action extends Component {
  constructor() {
    super();

    this.typeChanged = this.typeChanged.bind(this);
  }

  typeChanged(ev) {
    const newType = ev.target.selectedItem.attributes.action.value;
    const oldType = getType(this.props.action);

    if (oldType !== newType) {
      this.props.onChange(this.props.index, TYPES[newType].defaultConfig);
    }
  }

  render({ index, action, onChange, hass, localize }) {
    const type = getType(action);
    const Comp = type && TYPES[type];
    const selected = OPTIONS.indexOf(type);

    if (!Comp) {
      return (
        <div>
          {localize('ui.panel.config.automation.editor.actions.unsupported_action', 'action', type)}
          <pre>{JSON.stringify(action, null, 2)}</pre>
        </div>
      );
    }
    return (
      <div>
        <paper-dropdown-menu-light label={localize('ui.panel.config.automation.editor.actions.type_select')} no-animations>
          <paper-listbox
            slot="dropdown-content"
            selected={selected}
            oniron-select={this.typeChanged}
          >
            {OPTIONS.map(opt => <paper-item action={opt}>{localize(`ui.panel.config.automation.editor.actions.type.${opt}.label`)}</paper-item>)}
          </paper-listbox>
        </paper-dropdown-menu-light>
        <Comp
          index={index}
          action={action}
          onChange={onChange}
          hass={hass}
          localize={localize}
        />
      </div>
    );
  }
}
