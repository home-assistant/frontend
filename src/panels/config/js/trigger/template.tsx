import { h } from "preact";

import "../../../../components/ha-textarea";

import { onChangeEvent } from "../../../../common/preact/event";
import { AutomationComponent } from "../automation-component";

export default class TemplateTrigger extends AutomationComponent<any> {
  private onChange: (obj: any) => void;
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "trigger");
  }

  public render({ trigger, localize }) {
    /* eslint-disable camelcase */
    const { value_template } = trigger;
    return (
      <div>
        <ha-textarea
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.template.value_template"
          )}
          name="value_template"
          value={value_template}
          onvalue-changed={this.onChange}
          dir="ltr"
        />
      </div>
    );
  }
}

(TemplateTrigger as any).defaultConfig = {
  value_template: "",
};
