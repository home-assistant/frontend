import { h, Component } from "preact";
import "@polymer/paper-input/paper-input";

import "../../../../components/ha-textarea";

import { onChangeEvent } from "../../../../common/preact/event";

export default class WaitAction extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "action");
    this.onTemplateChange = this.onTemplateChange.bind(this);
  }

  // Gets fired on mount. If empty, onChangeEvent removes attribute.
  // Without the attribute this action is no longer matched to this component.
  onTemplateChange(ev) {
    this.props.onChange(
      this.props.index,
      Object.assign({}, this.props.trigger, {
        [ev.target.name]: ev.target.value,
      })
    );
  }

  render({ action, localize }) {
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

WaitAction.defaultConfig = {
  wait_template: "",
  timeout: "",
};
