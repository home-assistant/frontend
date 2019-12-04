import { h } from "preact";
import "@polymer/paper-input/paper-input";
import "../../../../components/ha-textarea";
import "../../../../components/entity/ha-entity-picker";

import { onChangeEvent } from "../../../../common/preact/event";
import { AutomationComponent } from "../automation-component";

export default class NumericStateCondition extends AutomationComponent<any> {
  private onChange: (obj: any) => void;
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "condition");
    this.entityPicked = this.entityPicked.bind(this);
  }

  public entityPicked(ev) {
    if (!this.initialized) {
      return;
    }
    this.props.onChange(this.props.index, {
      ...this.props.condition,
      entity_id: ev.target.value,
    });
  }

  /* eslint-disable camelcase */
  public render({ condition, hass, localize }) {
    const { value_template, entity_id, below, above } = condition;
    return (
      <div>
        <ha-entity-picker
          value={entity_id}
          onChange={this.entityPicked}
          hass={hass}
          allowCustomEntity
        />
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.conditions.type.numeric_state.above"
          )}
          name="above"
          value={above}
          onvalue-changed={this.onChange}
        />
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.conditions.type.numeric_state.below"
          )}
          name="below"
          value={below}
          onvalue-changed={this.onChange}
        />
        <ha-textarea
          label={localize(
            "ui.panel.config.automation.editor.conditions.type.numeric_state.value_template"
          )}
          name="value_template"
          value={value_template}
          onvalue-changed={this.onChange}
          dir="ltr"
        />
      </div>
    );
  }
}

(NumericStateCondition as any).defaultConfig = {
  entity_id: "",
};
