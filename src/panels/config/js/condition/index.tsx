import { h, Component } from "preact";
import "@material/mwc-button";
import "../../../../components/ha-card";

import ConditionRow from "./condition_row";

export default class Condition extends Component<any> {
  constructor() {
    super();

    this.addCondition = this.addCondition.bind(this);
    this.conditionChanged = this.conditionChanged.bind(this);
  }

  public addCondition() {
    const condition = this.props.condition.concat({
      condition: "state",
    });

    this.props.onChange(condition);
  }

  public conditionChanged(index, newValue) {
    const condition = this.props.condition.concat();

    if (newValue === null) {
      condition.splice(index, 1);
    } else {
      condition[index] = newValue;
    }

    this.props.onChange(condition);
  }

  public render({ condition, hass, localize }) {
    return (
      <div class="triggers">
        {condition.map((cnd, idx) => (
          <ConditionRow
            index={idx}
            condition={cnd}
            onChange={this.conditionChanged}
            hass={hass}
            localize={localize}
          />
        ))}
        <ha-card>
          <div class="card-actions add-card">
            <mwc-button onTap={this.addCondition}>
              {localize("ui.panel.config.automation.editor.conditions.add")}
            </mwc-button>
          </div>
        </ha-card>
      </div>
    );
  }
}
