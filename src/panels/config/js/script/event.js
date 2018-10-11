import { h, Component } from "preact";
import "@polymer/paper-input/paper-input.js";

import JSONTextArea from "../json_textarea.js";
import { onChangeEvent } from "../../../../common/preact/event.js";

export default class EventAction extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "action");
    this.serviceDataChanged = this.serviceDataChanged.bind(this);
  }

  serviceDataChanged(data) {
    this.props.onChange(
      this.props.index,
      Object.assign({}, this.props.action, { data })
    );
  }

  render({ action, localize }) {
    /* eslint-disable camelcase */
    const { event, event_data } = action;
    return (
      <div>
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.actions.type.event.event"
          )}
          name="event"
          value={event}
          onvalue-changed={this.onChange}
        />
        <JSONTextArea
          label={localize(
            "ui.panel.config.automation.editor.actions.type.event.service_data"
          )}
          value={event_data}
          onChange={this.serviceDataChanged}
        />
      </div>
    );
  }
}

EventAction.defaultConfig = {
  event: "",
  event_data: {},
};
