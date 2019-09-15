import { h, Component } from "preact";

import Condition from "./index";

export default class OrCondition extends Component<any, any> {
  constructor() {
    super();
    this.conditionChanged = this.conditionChanged.bind(this);
  }

  public conditionChanged(conditions) {
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

(OrCondition as any).defaultConfig = {
  conditions: [{ condition: "state" }],
};
