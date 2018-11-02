import { h, Component } from "preact";
import "../../../../components/entity/ha-entity-picker";
import { onChangeEvent } from "../../../../common/preact/event";
import hasLocation from "../../../../common/entity/has_location";
import computeStateDomain from "../../../../common/entity/compute_state_domain";

function zoneAndLocationFilter(stateObj) {
  return hasLocation(stateObj) && computeStateDomain(stateObj) !== "zone";
}

export default class ZoneCondition extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "condition");
    this.entityPicked = this.entityPicked.bind(this);
    this.zonePicked = this.zonePicked.bind(this);
  }

  entityPicked(ev) {
    this.props.onChange(
      this.props.index,
      Object.assign({}, this.props.condition, { entity_id: ev.target.value })
    );
  }

  zonePicked(ev) {
    this.props.onChange(
      this.props.index,
      Object.assign({}, this.props.condition, { zone: ev.target.value })
    );
  }

  /* eslint-disable camelcase */
  render({ condition, hass, localize }) {
    const { entity_id, zone } = condition;
    return (
      <div>
        <ha-entity-picker
          label={localize(
            "ui.panel.config.automation.editor.conditions.type.zone.entity"
          )}
          value={entity_id}
          onChange={this.entityPicked}
          hass={hass}
          allowCustomEntity
          entityFilter={zoneAndLocationFilter}
        />
        <ha-entity-picker
          label={localize(
            "ui.panel.config.automation.editor.conditions.type.zone.zone"
          )}
          value={zone}
          onChange={this.zonePicked}
          hass={hass}
          allowCustomEntity
          domainFilter="zone"
        />
      </div>
    );
  }
}

ZoneCondition.defaultConfig = {
  entity_id: "",
  zone: "",
};
