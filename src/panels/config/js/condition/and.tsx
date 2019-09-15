import { h, Component } from "preact";

import Condition from "./index";

export default class AndCondition extends Component<any, any> {
  constructor() {
    super();
    this.conditionChanged = this.conditionChanged.bind(this);
    console.log("AndCondition()", this);
  }

  public conditionChanged(conditions) {
    console.log("AndCondition.conditionChanged()", this, conditions);
    this.props.onChange(this.props.index, { ...this.props.condition, conditions:conditions });
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

(AndCondition as any).defaultConfig = {
  conditions: [{condition: "state"}],
};
