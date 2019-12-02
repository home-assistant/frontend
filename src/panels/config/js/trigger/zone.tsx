import { h } from "preact";

import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
import "../../../../components/entity/ha-entity-picker";

import { hasLocation } from "../../../../common/entity/has_location";
import { computeStateDomain } from "../../../../common/entity/compute_state_domain";
import { AutomationComponent } from "../automation-component";

function zoneAndLocationFilter(stateObj) {
  return hasLocation(stateObj) && computeStateDomain(stateObj) !== "zone";
}

export default class ZoneTrigger extends AutomationComponent {
  constructor() {
    super();

    this.radioGroupPicked = this.radioGroupPicked.bind(this);
    this.entityPicked = this.entityPicked.bind(this);
    this.zonePicked = this.zonePicked.bind(this);
  }

  /* eslint-disable camelcase */
  public render({ trigger, hass, localize }) {
    const { entity_id, zone, event } = trigger;
    return (
      <div>
        <ha-entity-picker
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.zone.entity"
          )}
          value={entity_id}
          onChange={this.entityPicked}
          hass={hass}
          allowCustomEntity
          entityFilter={zoneAndLocationFilter}
        />
        <ha-entity-picker
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.zone.zone"
          )}
          value={zone}
          onChange={this.zonePicked}
          hass={hass}
          allowCustomEntity
          includeDomains={["zone"]}
        />
        <label id="eventlabel">
          {localize(
            "ui.panel.config.automation.editor.triggers.type.zone.event"
          )}
        </label>
        <paper-radio-group
          selected={event}
          aria-labelledby="eventlabel"
          onpaper-radio-group-changed={this.radioGroupPicked}
        >
          <paper-radio-button name="enter">
            {localize(
              "ui.panel.config.automation.editor.triggers.type.zone.enter"
            )}
          </paper-radio-button>
          <paper-radio-button name="leave">
            {localize(
              "ui.panel.config.automation.editor.triggers.type.zone.leave"
            )}
          </paper-radio-button>
        </paper-radio-group>
      </div>
    );
  }

  private entityPicked(ev) {
    if (!this.initialized) {
      return;
    }
    this.props.onChange(this.props.index, {
      ...this.props.trigger,
      entity_id: ev.target.value,
    });
  }

  private zonePicked(ev) {
    if (!this.initialized) {
      return;
    }
    this.props.onChange(this.props.index, {
      ...this.props.trigger,
      zone: ev.target.value,
    });
  }

  private radioGroupPicked(ev) {
    if (!this.initialized) {
      return;
    }
    this.props.onChange(this.props.index, {
      ...this.props.trigger,
      event: ev.target.selected,
    });
  }
}

(ZoneTrigger as any).defaultConfig = {
  entity_id: "",
  zone: "",
  event: "enter",
};
