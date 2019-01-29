import { h, Component } from "preact";
import "@polymer/paper-radio-button/paper-radio-button";
import "@polymer/paper-radio-group/paper-radio-group";
import "../../../../components/entity/ha-entity-picker";

import { onChangeEvent } from "../../../../common/preact/event";

export default class GeolocationTrigger extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "trigger");
    this.zonePicked = this.zonePicked.bind(this);
    this.radioGroupPicked = this.radioGroupPicked.bind(this);
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
  render({ trigger, hass, localize }) {
    const { source, zone, event } = trigger;

    return (
      <div>
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.geo_location.source"
          )}
          name="source"
          value={source}
          onvalue-changed={this.onChange}
        />
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
