import { h, Component } from "preact";
import "../../../../components/ha-textarea.js";

import { onChangeEvent } from "../../../../common/preact/event.js";

export default class TemplateCondition extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "condition");
  }

  render({ condition, localize }) {
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
        />
      </div>
    );
  }
}

TemplateCondition.defaultConfig = {
  value_template: "",
};
