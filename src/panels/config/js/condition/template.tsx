import { h } from "preact";
import "../../../../components/ha-textarea";

import { onChangeEvent } from "../../../../common/preact/event";
import { AutomationComponent } from "../automation-component";

export default class TemplateCondition extends AutomationComponent<any> {
  private onChange: (obj: any) => void;
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "condition");
  }

  public render({ condition, localize }) {
    /* eslint-disable camelcase */
    const { value_template } = condition;
    return (
      <div>
        <ha-textarea
          label={localize(
            "ui.panel.config.automation.editor.conditions.type.template.value_template"
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

(TemplateCondition as any).defaultConfig = {
  value_template: "",
};
