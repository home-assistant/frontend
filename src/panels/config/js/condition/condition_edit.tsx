import { h, Component } from "preact";
import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-listbox/paper-listbox";
import "@polymer/paper-item/paper-item";

import YAMLTextArea from "../yaml_textarea";

import DeviceCondition from "./device";
import LogicalCondition from "./logical";
import NumericStateCondition from "./numeric_state";
import StateCondition from "./state";
import SunCondition from "./sun";
import TemplateCondition from "./template";
import TimeCondition from "./time";
import ZoneCondition from "./zone";

const TYPES = {
  and: LogicalCondition,
  device: DeviceCondition,
  numeric_state: NumericStateCondition,
  or: LogicalCondition,
  state: StateCondition,
  sun: SunCondition,
  template: TemplateCondition,
  time: TimeCondition,
  zone: ZoneCondition,
};

const OPTIONS = Object.keys(TYPES).sort();

export default class ConditionEdit extends Component<any> {
  constructor() {
    super();

    this.typeChanged = this.typeChanged.bind(this);
    this.onYamlChange = this.onYamlChange.bind(this);
  }

  public typeChanged(ev) {
    const type = ev.target.selectedItem.attributes.condition.value;

    if (type !== this.props.condition.condition) {
      this.props.onChange(this.props.index, {
        condition: type,
        ...TYPES[type].defaultConfig,
      });
    }
  }

  public render({ index, condition, onChange, hass, localize, yamlMode }) {
    // tslint:disable-next-line: variable-name
    const Comp = TYPES[condition.condition];
    const selected = OPTIONS.indexOf(condition.condition);

    if (yamlMode || !Comp) {
      return (
        <div style="margin-right: 24px;">
          {!Comp && (
            <div>
              {localize(
                "ui.panel.config.automation.editor.conditions.unsupported_condition",
                "condition",
                condition.condition
              )}
            </div>
          )}
          <YAMLTextArea value={condition} onChange={this.onYamlChange} />
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

  private onYamlChange(condition) {
    this.props.onChange(this.props.index, condition);
  }
}
