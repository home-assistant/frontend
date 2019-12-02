import { h } from "preact";

import "@polymer/paper-input/paper-input";
import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";

import { onChangeEvent } from "../../../../common/preact/event";
import { AutomationComponent } from "../automation-component";

export default class SunTrigger extends AutomationComponent<any> {
  private onChange: (obj: any) => void;
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "trigger");
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
    const { offset, event } = trigger;
    return (
      <div>
        <label id="eventlabel">
          {localize(
            "ui.panel.config.automation.editor.triggers.type.sun.event"
          )}
        </label>
        <paper-radio-group
          selected={event}
          aria-labelledby="eventlabel"
          onpaper-radio-group-changed={this.radioGroupPicked}
        >
          <paper-radio-button name="sunrise">
            {localize(
              "ui.panel.config.automation.editor.triggers.type.sun.sunrise"
            )}
          </paper-radio-button>
          <paper-radio-button name="sunset">
            {localize(
              "ui.panel.config.automation.editor.triggers.type.sun.sunset"
            )}
          </paper-radio-button>
        </paper-radio-group>

        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.sun.offset"
          )}
          name="offset"
          value={offset}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

(SunTrigger as any).defaultConfig = {
  event: "sunrise",
};
