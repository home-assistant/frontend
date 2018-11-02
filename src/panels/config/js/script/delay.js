import { h, Component } from "preact";
import "@polymer/paper-input/paper-input";
import { onChangeEvent } from "../../../../common/preact/event";

export default class DelayAction extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "action");
  }

  render({ action, localize }) {
    const { delay } = action;
    return (
      <div>
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.actions.type.delay.delay"
          )}
          name="delay"
          value={delay}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

DelayAction.defaultConfig = {
  delay: "",
};
