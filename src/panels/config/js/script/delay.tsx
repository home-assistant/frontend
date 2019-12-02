import { h } from "preact";
import "@polymer/paper-input/paper-input";
import { AutomationComponent } from "../automation-component";

export default class DelayAction extends AutomationComponent<any> {
  constructor() {
    super();

    this.onChange = this.onChange.bind(this);
  }

  public render({ action, localize }) {
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

  private onChange(ev) {
    if (
      !this.initialized ||
      ev.target.value === this.props.action[ev.target.name]
    ) {
      return;
    }

    this.props.onChange(this.props.index, {
      ...this.props.action,
      [ev.target.name]: ev.target.value,
    });
  }
}

(DelayAction as any).defaultConfig = {
  delay: "",
};
