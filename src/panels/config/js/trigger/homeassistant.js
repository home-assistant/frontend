import { h, Component } from "preact";
import "@polymer/paper-radio-button/paper-radio-button.js";
import "@polymer/paper-radio-group/paper-radio-group.js";

export default class HassTrigger extends Component {
  constructor() {
    super();

    this.radioGroupPicked = this.radioGroupPicked.bind(this);
  }

  radioGroupPicked(ev) {
    this.props.onChange(
      this.props.index,
      Object.assign({}, this.props.trigger, { event: ev.target.selected })
    );
  }

  /* eslint-disable camelcase */
  render({ trigger, localize }) {
    const { event } = trigger;
    return (
      <div>
        <label id="eventlabel">
          {localize(
            "ui.panel.config.automation.editor.triggers.type.homeassistant.event"
          )}
        </label>
        <paper-radio-group
          selected={event}
          aria-labelledby="eventlabel"
          onpaper-radio-group-changed={this.radioGroupPicked}
        >
          <paper-radio-button name="start">
            {localize(
              "ui.panel.config.automation.editor.triggers.type.homeassistant.start"
            )}
          </paper-radio-button>
          <paper-radio-button name="shutdown">
            {localize(
              "ui.panel.config.automation.editor.triggers.type.homeassistant.shutdown"
            )}
          </paper-radio-button>
        </paper-radio-group>
      </div>
    );
  }
}

HassTrigger.defaultConfig = {
  event: "start",
};
