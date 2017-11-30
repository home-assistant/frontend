import { h, Component } from 'preact';

import { onChangeEvent } from '../../common/util/event.js';
import { hasLocation } from '../../common/util/location.js';
import computeStateDomain from '../../common/util/compute_state_domain.js';

function zoneAndLocationFilter(stateObj) {
  return hasLocation(stateObj) && computeStateDomain(stateObj) !== 'zone';
}

export default class ZoneCondition extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'condition');
    this.entityPicked = this.entityPicked.bind(this);
    this.zonePicked = this.zonePicked.bind(this);
  }

  entityPicked(ev) {
    this.props.onChange(this.props.index, {
      ...this.props.condition,
      entity_id: ev.target.value,
    });
  }

  zonePicked(ev) {
    this.props.onChange(this.props.index, {
      ...this.props.condition,
      zone: ev.target.value,
    });
  }

  /* eslint-disable camelcase */
  render({ condition, hass }) {
    const { entity_id, zone } = condition;
    return (
      <div>
        <ha-entity-picker
          label='Entity with location'
          value={entity_id}
          onChange={this.entityPicked}
          hass={hass}
          allowCustomEntity
          entityFilter={zoneAndLocationFilter}
        />
        <ha-entity-picker
          label='Zone'
          value={zone}
          onChange={this.zonePicked}
          hass={hass}
          allowCustomEntity
          domainFilter='zone'
        />
      </div>
    );
  }
}

ZoneCondition.defaultConfig = {
  entity_id: '',
  zone: '',
};
