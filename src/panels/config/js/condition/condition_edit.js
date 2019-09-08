import { h, Component } from "preact";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-item/paper-item";

import DeviceCondition from "./device";
import NumericStateCondition from "./numeric_state";
import StateCondition from "./state";
import SunCondition from "./sun";
import TemplateCondition from "./template";
import TimeCondition from "./time";
import ZoneCondition from "./zone";

const TYPES = {
  device: DeviceCondition,
  state: StateCondition,
  numeric_state: NumericStateCondition,
  sun: SunCondition,
  template: TemplateCondition,
  time: TimeCondition,
  zone: ZoneCondition,
};

const OPTIONS = Object.keys(TYPES).sort();

export default class ConditionRow extends Component {
  constructor() {
    super();

    this.typeChanged = this.typeChanged.bind(this);
  }

  typeChanged(ev) {
    const type = ev.target.selectedItem.attributes.condition.value;

    if (type !== this.props.condition.condition) {
      this.props.onChange(
        this.props.index,
        Object.assign({ condition: type }, TYPES[type].defaultConfig)
      );
    }
  }

  render({ index, condition, onChange, hass, localize }) {
    const Comp = TYPES[condition.condition];
    const selected = OPTIONS.indexOf(condition.condition);

    if (!Comp) {
      return (
        <div>
          {localize(
            "ui.panel.config.automation.editor.conditions.unsupported_condition",
            "condition",
            condition.condition
          )}
          <pre>{JSON.stringify(condition, null, 2)}</pre>
        </div>
      );
    }

    return (
      <div>
        <paper-dropdown-menu-light
          label={localize(
            "ui.panel.config.automation.editor.conditions.type_select"
          )}
          no-animations
        >
          <paper-listbox
            slot="dropdown-content"
            selected={selected}
            oniron-select={this.typeChanged}
          >
            {OPTIONS.map((opt) => (
              <paper-item condition={opt}>
                {localize(
                  `ui.panel.config.automation.editor.conditions.type.${opt}.label`
                )}
              </paper-item>
            ))}
          </paper-listbox>
        </paper-dropdown-menu-light>
        <Comp
          index={index}
          condition={condition}
          onChange={onChange}
          hass={hass}
          localize={localize}
        />
      </div>
    );
  }
}
