import { h } from "preact";

import "@polymer/paper-input/paper-input";

import { onChangeEvent } from "../../../../common/preact/event";
import { AutomationComponent } from "../automation-component";

export default class TimeTrigger extends AutomationComponent<any> {
  private onChange: (obj: any) => void;
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "trigger");
  }

  /* eslint-disable camelcase */
  public render({ trigger, localize }) {
    const { at } = trigger;
    return (
      <div>
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.time.at"
          )}
          name="at"
          value={at}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

(TimeTrigger as any).defaultConfig = {
  at: "",
};
