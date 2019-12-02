import { h } from "preact";
import "@polymer/paper-input/paper-input";

import "../../../../components/ha-textarea";

import { onChangeEvent } from "../../../../common/preact/event";
import { AutomationComponent } from "../automation-component";

export default class WaitAction extends AutomationComponent<any> {
  private onChange: (obj: any) => void;
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "action");
    this.onTemplateChange = this.onTemplateChange.bind(this);
  }

  // Gets fired on mount. If empty, onChangeEvent removes attribute.
  // Without the attribute this action is no longer matched to this component.
  public onTemplateChange(ev) {
    if (!this.initialized) {
      return;
    }
    this.props.onChange(this.props.index, {
      ...this.props.action,
      [ev.target.getAttribute("name")]: ev.target.value,
    });
  }

  public render({ action, localize }) {
    /* eslint-disable camelcase */
    const { wait_template, timeout } = action;
    return (
      <div>
        <ha-textarea
          label={localize(
            "ui.panel.config.automation.editor.actions.type.wait_template.wait_template"
          )}
          name="wait_template"
          value={wait_template}
          onvalue-changed={this.onTemplateChange}
          dir="ltr"
        />
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.actions.type.wait_template.timeout"
          )}
          name="timeout"
          value={timeout}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

(WaitAction as any).defaultConfig = {
  wait_template: "",
  timeout: "",
};
