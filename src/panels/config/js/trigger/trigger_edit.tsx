import { h, Component } from "preact";

import "@polymer/paper-dropdown-menu/paper-dropdown-menu-light";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";

import "../../../../components/ha-code-editor";

import YAMLTextArea from "../yaml_textarea";

import DeviceTrigger from "./device";
import EventTrigger from "./event";
import GeolocationTrigger from "./geo_location";
import HassTrigger from "./homeassistant";
import MQTTTrigger from "./mqtt";
import NumericStateTrigger from "./numeric_state";
import TimePatternTrigger from "./time_pattern";
import StateTrigger from "./state";
import SunTrigger from "./sun";
import TemplateTrigger from "./template";
import TimeTrigger from "./time";
import WebhookTrigger from "./webhook";
import ZoneTrigger from "./zone";

const TYPES = {
  device: DeviceTrigger,
  event: EventTrigger,
  state: StateTrigger,
  geo_location: GeolocationTrigger,
  homeassistant: HassTrigger,
  mqtt: MQTTTrigger,
  numeric_state: NumericStateTrigger,
  sun: SunTrigger,
  template: TemplateTrigger,
  time: TimeTrigger,
  time_pattern: TimePatternTrigger,
  webhook: WebhookTrigger,
  zone: ZoneTrigger,
};

const OPTIONS = Object.keys(TYPES).sort();

export default class TriggerEdit extends Component<any> {
  constructor() {
    super();

    this.typeChanged = this.typeChanged.bind(this);
    this.onYamlChange = this.onYamlChange.bind(this);
  }

  public render({ index, trigger, onChange, hass, localize, yamlMode }) {
    // tslint:disable-next-line: variable-name
    const Comp = TYPES[trigger.platform];
    const selected = OPTIONS.indexOf(trigger.platform);

    if (yamlMode || !Comp) {
      return (
        <div style="margin-right: 24px;">
          {!Comp && (
            <div>
              {localize(
                "ui.panel.config.automation.editor.triggers.unsupported_platform",
                "platform",
                trigger.platform
              )}
            </div>
          )}
          <YAMLTextArea value={trigger} onChange={this.onYamlChange} />
        </div>
      );
    }

    return (
      <div>
        <paper-dropdown-menu-light
          label={localize(
            "ui.panel.config.automation.editor.triggers.type_select"
          )}
          no-animations
        >
          <paper-listbox
            slot="dropdown-content"
            selected={selected}
            oniron-select={this.typeChanged}
          >
            {OPTIONS.map((opt) => (
              <paper-item platform={opt}>
                {localize(
                  `ui.panel.config.automation.editor.triggers.type.${opt}.label`
                )}
              </paper-item>
            ))}
          </paper-listbox>
        </paper-dropdown-menu-light>
        <Comp
          index={index}
          trigger={trigger}
          onChange={onChange}
          hass={hass}
          localize={localize}
        />
      </div>
    );
  }

  private typeChanged(ev) {
    const type = ev.target.selectedItem.attributes.platform.value;

    if (type !== this.props.trigger.platform) {
      this.props.onChange(this.props.index, {
        platform: type,
        ...TYPES[type].defaultConfig,
      });
    }
  }

  private onYamlChange(trigger) {
    this.props.onChange(this.props.index, trigger);
  }
}
