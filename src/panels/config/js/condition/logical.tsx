import { h, Component } from "preact";

import Condition from "./index";

export default class LogicalCondition extends Component<any, any> {
  private _mounted = false;
  constructor() {
    super();
    this.conditionChanged = this.conditionChanged.bind(this);
  }

  public conditionChanged(conditions) {
    if (this._mounted) {
      this.props.onChange(this.props.index, {
        ...this.props.condition,
        conditions,
      });
    }
  }

  public componentWillMount() {
    this._mounted = true;
  }

  public componentWillUnmount() {
    this._mounted = false;
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
