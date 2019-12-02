import { h } from "preact";

import "@polymer/paper-input/paper-input";

import { onChangeEvent } from "../../../../common/preact/event";
import { AutomationComponent } from "../automation-component";

export default class TimePatternTrigger extends AutomationComponent {
  private onChange: (obj: any) => void;
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "trigger");
  }

  /* eslint-disable camelcase */
  public render({ trigger, localize }) {
    const { hours, minutes, seconds } = trigger;
    return (
      <div>
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.time_pattern.hours"
          )}
          name="hours"
          value={hours}
          onvalue-changed={this.onChange}
        />
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.time_pattern.minutes"
          )}
          name="minutes"
          value={minutes}
          onvalue-changed={this.onChange}
        />
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.time_pattern.seconds"
          )}
          name="seconds"
          value={seconds}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

(TimePatternTrigger as any).defaultConfig = {
  hours: "",
  minutes: "",
  seconds: "",
};
