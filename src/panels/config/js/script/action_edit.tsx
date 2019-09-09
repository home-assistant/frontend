import { h, Component } from "preact";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-item/paper-item";

import CallServiceAction from "./call_service";
import ConditionAction from "./condition";
import DelayAction from "./delay";
import DeviceAction from "./device";
import EventAction from "./event";
import WaitAction from "./wait";

const TYPES = {
  service: CallServiceAction,
  delay: DelayAction,
  wait_template: WaitAction,
  condition: ConditionAction,
  event: EventAction,
  device_id: DeviceAction,
};

const OPTIONS = Object.keys(TYPES).sort();

function getType(action) {
  const keys = Object.keys(TYPES);
  // tslint:disable-next-line: prefer-for-of
  for (let i = 0; i < keys.length; i++) {
    if (keys[i] in action) {
      return keys[i];
    }
  }
  return null;
}

export default class Action extends Component<any> {
  constructor() {
    super();

    this.typeChanged = this.typeChanged.bind(this);
  }

  public typeChanged(ev) {
    const newType = ev.target.selectedItem.attributes.action.value;
    const oldType = getType(this.props.action);

    if (oldType !== newType) {
      this.props.onChange(this.props.index, TYPES[newType].defaultConfig);
    }
  }

  public render({ index, action, onChange, hass, localize }) {
    const type = getType(action);
    // tslint:disable-next-line: variable-name
    const Comp = type && TYPES[type];
    // @ts-ignore
    const selected = OPTIONS.indexOf(type);

    if (!Comp) {
      return (
        <div>
          {localize(
            "ui.panel.config.automation.editor.actions.unsupported_action",
            "action",
            type
          )}
          <pre>{JSON.stringify(action, null, 2)}</pre>
        </div>
      );
    }
    return (
      <div>
        <paper-dropdown-menu-light
          label={localize(
            "ui.panel.config.automation.editor.actions.type_select"
          )}
          no-animations
        >
          <paper-listbox
            slot="dropdown-content"
            selected={selected}
            oniron-select={this.typeChanged}
          >
            {OPTIONS.map((opt) => (
              <paper-item action={opt}>
                {localize(
                  `ui.panel.config.automation.editor.actions.type.${opt}.label`
                )}
              </paper-item>
            ))}
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
