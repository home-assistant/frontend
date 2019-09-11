import { h, Component } from "preact";
import "@polymer/paper-input/paper-input";

import { onChangeEvent } from "../../../../common/preact/event";

export default class TimeCondition extends Component<any> {
  private onChange: (obj: any) => void;
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "condition");
  }

  /* eslint-disable camelcase */
  public render({ condition, localize }) {
    const { after, before } = condition;
    return (
      <div>
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.conditions.type.time.after"
          )}
          name="after"
          value={after}
          onvalue-changed={this.onChange}
        />
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.conditions.type.time.before"
          )}
          name="before"
          value={before}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

(TimeCondition as any).defaultConfig = {};
