import { h, Component } from 'preact';
import '@polymer/paper-radio-button/paper-radio-button.js';
import '@polymer/paper-radio-group/paper-radio-group.js';
import '../../../../components/entity/ha-entity-picker.js';

import { onChangeEvent } from '../../../../common/preact/event.js';
import hasLocation from '../../../../common/entity/has_location.js';
import computeStateDomain from '../../../../common/entity/compute_state_domain.js';

function zoneAndLocationFilter(stateObj) {
  return hasLocation(stateObj) && computeStateDomain(stateObj) !== 'zone';
}

export default class ZoneTrigger extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'trigger');
    this.radioGroupPicked = this.radioGroupPicked.bind(this);
    this.entityPicked = this.entityPicked.bind(this);
    this.zonePicked = this.zonePicked.bind(this);
  }

  entityPicked(ev) {
    this.props.onChange(this.props.index, Object.assign(
      {}, this.props.trigger,
      { entity_id: ev.target.value },
    ));
  }

  zonePicked(ev) {
    this.props.onChange(this.props.index, Object.assign(
      {}, this.props.trigger,
      { zone: ev.target.value },
    ));
  }

  radioGroupPicked(ev) {
    this.props.onChange(this.props.index, Object.assign(
      {}, this.props.trigger,
      { event: ev.target.selected },
    ));
  }

  /* eslint-disable camelcase */
  render({ trigger, hass, localize }) {
    const { entity_id, zone, event } = trigger;
    return (
      <div>
        <ha-entity-picker
          label={localize('ui.panel.config.automation.editor.triggers.type.zone.entity')}
          value={entity_id}
          onChange={this.entityPicked}
          hass={hass}
          allowCustomEntity
          entityFilter={zoneAndLocationFilter}
        />
        <ha-entity-picker
          label={localize('ui.panel.config.automation.editor.triggers.type.zone.zone')}
          value={zone}
          onChange={this.zonePicked}
          hass={hass}
          allowCustomEntity
          domainFilter='zone'
        />
        <label id="eventlabel">{localize('ui.panel.config.automation.editor.triggers.type.zone.event')}</label>
        <paper-radio-group
          selected={event}
          aria-labelledby="eventlabel"
          onpaper-radio-group-changed={this.radioGroupPicked}
        >
          <paper-radio-button name="enter">{localize('ui.panel.config.automation.editor.triggers.type.zone.enter')}</paper-radio-button>
          <paper-radio-button name="leave">{localize('ui.panel.config.automation.editor.triggers.type.zone.leave')}</paper-radio-button>
        </paper-radio-group>
      </div>
    );
  }
}

ZoneTrigger.defaultConfig = {
  entity_id: '',
  zone: '',
  event: 'enter',
};
