import { h, Component } from 'preact';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-input/paper-textarea.js';
import '../../../../components/entity/ha-entity-picker.js';

import { onChangeEvent } from '../../../../common/preact/event.js';

export default class NumericStateCondition extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'condition');
    this.entityPicked = this.entityPicked.bind(this);
  }

  entityPicked(ev) {
    this.props.onChange(this.props.index, Object.assign(
      {}, this.props.condition,
      { entity_id: ev.target.value },
    ));
  }

  /* eslint-disable camelcase */
  render({ condition, hass, localize }) {
    const {
      value_template, entity_id, below, above
    } = condition;
    return (
      <div>
        <ha-entity-picker
          value={entity_id}
          onChange={this.entityPicked}
          hass={hass}
          allowCustomEntity
        />
        <paper-input
          label={localize('ui.panel.config.automation.editor.conditions.type.numeric_state.above')}
          name="above"
          value={above}
          onvalue-changed={this.onChange}
        />
        <paper-input
          label={localize('ui.panel.config.automation.editor.conditions.type.numeric_state.below')}
          name="below"
          value={below}
          onvalue-changed={this.onChange}
        />
        <paper-textarea
          label={localize('ui.panel.config.automation.editor.conditions.type.numeric_state.value_template')}
          name="value_template"
          value={value_template}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

NumericStateCondition.defaultConfig = {
  entity_id: '',
};
