import { h, Component } from 'preact';

import CallServiceAction from './call_service';
import DelayAction from './delay';
import EventAction from './event';
import WaitAction from './wait';

const TYPES = {
  'Call Service': CallServiceAction,
  Delay: DelayAction,
  Wait: WaitAction,
  // Condition: null,
  'Fire Event': EventAction,
};

const OPTIONS = Object.keys(TYPES).sort();

function getType(action) {
  const keys = Object.keys(TYPES);
  for (let i = 0; i < keys.length; i++) {
    if (TYPES[keys[i]].configKey in action) {
      return keys[i];
    }
  }
  return null;
}

export default class Action extends Component {
  constructor() {
    super();

    this.typeChanged = this.typeChanged.bind(this);
    this.onDelete = this.onDelete.bind(this);
  }

  typeChanged(ev) {
    const newType = ev.target.selectedItem.innerHTML;
    const oldType = getType(this.props.action);

    if (oldType !== newType) {
      this.props.onChange(this.props.index, TYPES[newType].defaultConfig);
    }
  }

  onDelete() {
    // eslint-disable-next-line
    if (confirm('Sure you want to delete?')) {
      this.props.onChange(this.props.index, null);
    }
  }

  render({ index, action, onChange }) {
    const type = getType(action);
    const Comp = type && TYPES[type];
    const selected = OPTIONS.indexOf(type);
    let content;

    if (Comp) {
      content = (
        <div>
          <paper-dropdown-menu-light label="Action Type" no-animations>
            <paper-listbox
              slot="dropdown-content"
              selected={selected}
              oniron-select={this.typeChanged}
            >
              {OPTIONS.map(opt =>
                <paper-item disabled={TYPES[opt] === null}>{opt}</paper-item>)}
            </paper-listbox>
          </paper-dropdown-menu-light>
          <Comp
            index={index}
            action={action}
            onChange={onChange}
          />
        </div>
      );
    } else {
      content = (
        <div>
          Unsupported action
          <pre>{JSON.stringify(action, null, 2)}</pre>
        </div>
      );
    }

    return (
      <paper-card>
        <div class='card-menu'>
          <paper-menu-button
            no-animations
            horizontal-align="right"
            horizontal-offset="-5"
            vertical-offset="-5"
          >
            <paper-icon-button
              icon="mdi:dots-vertical"
              slot="dropdown-trigger"
            />
            <paper-listbox slot="dropdown-content">
              <paper-item disabled>Duplicate</paper-item>
              <paper-item onTap={this.onDelete}>Delete</paper-item>
            </paper-listbox>
          </paper-menu-button>
        </div>
        <div class='card-content'>{content}</div>
      </paper-card>
    );
  }

}
