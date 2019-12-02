import { h } from "preact";
import "@polymer/paper-input/paper-input";
import { onChangeEvent } from "../../../../common/preact/event";
import { AutomationComponent } from "../automation-component";

export default class DelayAction extends AutomationComponent<any> {
  private onChange: (obj: any) => void;
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "action");
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
}

(DelayAction as any).defaultConfig = {
  delay: "",
};
