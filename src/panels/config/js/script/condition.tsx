import { h, Component } from "preact";

import "../../automation/condition/ha-automation-condition-editor";

export default class ConditionAction extends Component<any> {
  constructor() {
    super();

    this.conditionChanged = this.conditionChanged.bind(this);
  }

  public conditionChanged(ev) {
    this.props.onChange(this.props.index, ev.detail.value);
  }

  // eslint-disable-next-line
  public render({ action, hass }) {
    return (
      <div>
        <ha-automation-condition-editor
          condition={action}
          onvalue-changed={this.conditionChanged}
          hass={hass}
        />
      </div>
    );
  }
}

(ConditionAction as any).defaultConfig = {
  condition: "state",
};
