import { h } from "preact";

import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";

import { AutomationComponent } from "../automation-component";

export default class HassTrigger extends AutomationComponent {
  constructor() {
    super();

    this.radioGroupPicked = this.radioGroupPicked.bind(this);
  }

  public radioGroupPicked(ev) {
    if (!this.initialized) {
      return;
    }
    this.props.onChange(this.props.index, {
      ...this.props.trigger,
      event: ev.target.selected,
    });
  }

  /* eslint-disable camelcase */
  public render({ trigger, localize }) {
    const { event } = trigger;
    return (
      <div>
        <label id="eventlabel">
          {localize(
            "ui.panel.config.automation.editor.triggers.type.homeassistant.event"
          )}
        </label>
        <paper-radio-group
          selected={event}
          aria-labelledby="eventlabel"
          onpaper-radio-group-changed={this.radioGroupPicked}
        >
          <paper-radio-button name="start">
            {localize(
              "ui.panel.config.automation.editor.triggers.type.homeassistant.start"
            )}
          </paper-radio-button>
          <paper-radio-button name="shutdown">
            {localize(
              "ui.panel.config.automation.editor.triggers.type.homeassistant.shutdown"
            )}
          </paper-radio-button>
        </paper-radio-group>
      </div>
    );
  }
}

(HassTrigger as any).defaultConfig = {
  event: "start",
};
