import { h, Component } from 'preact';

import { onChangeEvent } from '../../../../common/preact/event.js';

export default class StateTrigger extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'trigger');
    this.entityPicked = this.entityPicked.bind(this);
  }

  entityPicked(ev) {
    this.props.onChange(this.props.index, Object.assign(
      {}, this.props.trigger,
      { entity_id: ev.target.value },
    ));
  }

  /* eslint-disable camelcase */
  render({ trigger, hass, localize }) {
    const { entity_id, to } = trigger;
    const trgFrom = trigger.from;
    const trgFor = trigger.for;
    return (
      <div>
        <ha-entity-picker
          value={entity_id}
          onChange={this.entityPicked}
          hass={hass}
          allowCustomEntity
        />
        <paper-input
          label={localize('ui.panel.config.automation.editor.triggers.type.state.from')}
          name="from"
          value={trgFrom}
          onvalue-changed={this.onChange}
        />
        <paper-input
          label={localize('ui.panel.config.automation.editor.triggers.type.state.to')}
          name="to"
          value={to}
          onvalue-changed={this.onChange}
        />
        {trgFor && <pre>For: {JSON.stringify(trgFor, null, 2)}</pre>}
      </div>
    );
  }
}

StateTrigger.defaultConfig = {
  entity_id: '',
};
