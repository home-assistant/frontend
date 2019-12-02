import { h } from "preact";

import Condition from "./index";
import { AutomationComponent } from "../automation-component";

export default class LogicalCondition extends AutomationComponent {
  constructor() {
    super();
    this.conditionChanged = this.conditionChanged.bind(this);
  }

  public conditionChanged(conditions) {
    if (!this.initialized) {
      return;
    }
    this.props.onChange(this.props.index, {
      ...this.props.condition,
      conditions,
    });
  }

  /* eslint-disable camelcase */
  public render({ condition, hass, localize }) {
    return (
      <div>
        <Condition
          condition={condition.conditions || []}
          onChange={this.conditionChanged}
          hass={hass}
          localize={localize}
        />
      </div>
    );
  }
}

(LogicalCondition as any).defaultConfig = {
  conditions: [{ condition: "state" }],
};
