import { h, Component } from "preact";
import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
import "../../../../components/entity/ha-entity-picker";

import { onChangeEvent } from "../../../../common/preact/event";
import hasLocation from "../../../../common/entity/has_location";
import computeStateDomain from "../../../../common/entity/compute_state_domain";

const SOURCES = {
  geo_json_events: "GeoJSON Events",
  nsw_rural_fire_service_feed: "NSW Rural Fire Service Incidents",
  usgs_earthquakes_feed: "U.S. Geological Survey Earthquake Hazards Program",
};
//const SOURCES = [
//  { key: "geo_json_events", label: "GeoJSON Events" },
//  { key: "nsw_rural_fire_service_feed", label: "NSW Rural Fire Service Incidents" },
//  { key: "usgs_earthquakes_feed", label: "U.S. Geological Survey Earthquake Hazards Program" },
//];

const OPTIONS = Object.keys(SOURCES).sort();

function zoneAndLocationFilter(stateObj) {
  return hasLocation(stateObj) && computeStateDomain(stateObj) !== "zone";
}

export default class GeolocationTrigger extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "trigger");
    this.sourcePicked = this.sourcePicked.bind(this);
    this.zonePicked = this.zonePicked.bind(this);
    this.radioGroupPicked = this.radioGroupPicked.bind(this);
  }

  sourcePicked(ev) {
    this.props.onChange(
      this.props.index,
      Object.assign({}, this.props.trigger, {
        source: ev.target.selectedItem.attributes.source.value,
      })
    );
  }

  zonePicked(ev) {
    this.props.onChange(
      this.props.index,
      Object.assign({}, this.props.trigger, { zone: ev.target.value })
    );
  }

  radioGroupPicked(ev) {
    this.props.onChange(
      this.props.index,
      Object.assign({}, this.props.trigger, { event: ev.target.selected })
    );
  }

  /* eslint-disable camelcase */
  render({ index, trigger, onChange, hass, localize }) {
    const { source, zone, event } = trigger;
    const selected = OPTIONS.indexOf(trigger.source);

    return (
      <div>
        <paper-dropdown-menu
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.geo_location.source"
          )}
          no-animations
        >
          <paper-listbox
            slot="dropdown-content"
            selected={selected}
            oniron-select={this.sourcePicked}
          >
            {OPTIONS.map((opt) => (
              <paper-item source={opt}>{SOURCES[opt]}</paper-item>
            ))}
          </paper-listbox>
        </paper-dropdown-menu>
        <ha-entity-picker
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.geo_location.zone"
          )}
          value={zone}
          onChange={this.zonePicked}
          hass={hass}
          allowCustomEntity
          domainFilter="zone"
        />
        <label id="eventlabel">
          {localize(
            "ui.panel.config.automation.editor.triggers.type.geo_location.event"
          )}
        </label>
        <paper-radio-group
          selected={event}
          aria-labelledby="eventlabel"
          onpaper-radio-group-changed={this.radioGroupPicked}
        >
          <paper-radio-button name="enter">
            {localize(
              "ui.panel.config.automation.editor.triggers.type.geo_location.enter"
            )}
          </paper-radio-button>
          <paper-radio-button name="leave">
            {localize(
              "ui.panel.config.automation.editor.triggers.type.geo_location.leave"
            )}
          </paper-radio-button>
        </paper-radio-group>
      </div>
    );
  }
}

GeolocationTrigger.defaultConfig = {
  source: "",
  zone: "",
  event: "enter",
};
