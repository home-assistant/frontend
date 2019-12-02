import { h } from "preact";

import "@polymer/paper-input/paper-input";

import YAMLTextArea from "../yaml_textarea";
import { onChangeEvent } from "../../../../common/preact/event";
import { AutomationComponent } from "../automation-component";

export default class EventTrigger extends AutomationComponent<any> {
  private onChange: (obj: any) => void;
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "trigger");
    this.eventDataChanged = this.eventDataChanged.bind(this);
  }

  /* eslint-disable camelcase */
  // tslint:disable-next-line: variable-name
  public eventDataChanged(event_data) {
    this.props.onChange(this.props.index, {
      ...this.props.trigger,
      event_data,
    });
  }

  public render({ trigger, localize }) {
    const { event_type, event_data } = trigger;
    return (
      <div>
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.event.event_type"
          )}
          name="event_type"
          value={event_type}
          onvalue-changed={this.onChange}
        />
        <YAMLTextArea
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.event.event_data"
          )}
          value={event_data}
          onChange={this.eventDataChanged}
        />
      </div>
    );
  }
}

(EventTrigger as any).defaultConfig = {
  event_type: "",
  event_data: {},
};
