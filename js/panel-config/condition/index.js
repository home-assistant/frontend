import { h, Component } from 'preact';

import ConditionRow from './condition_row.js';

export default class Condition extends Component {
  constructor() {
    super();

    this.addCondition = this.addCondition.bind(this);
    this.conditionChanged = this.conditionChanged.bind(this);
  }

  addCondition() {
    const condition = this.props.condition.concat({
      condition: 'state',
    });

    this.props.onChange(condition);
  }

  conditionChanged(index, newValue) {
    const condition = this.props.condition.concat();

    if (newValue === null) {
      condition.splice(index, 1);
    } else {
      condition[index] = newValue;
    }

    this.props.onChange(condition);
  }

  render({ condition, hass }) {
    return (
      <div class="triggers">
        {condition.map((cnd, idx) => (
          <ConditionRow
            index={idx}
            condition={cnd}
            onChange={this.conditionChanged}
            hass={hass}
          />))}
        <paper-card>
          <div class='card-actions add-card'>
            <paper-button onTap={this.addCondition}>Add condition</paper-button>
          </div>
        </paper-card>
      </div>
    );
  }
}
