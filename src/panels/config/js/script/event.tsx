import { h, Component } from "preact";
import "@polymer/paper-input/paper-input";

import JSONTextArea from "../json_textarea";
import { onChangeEvent } from "../../../../common/preact/event";
import { LocalizeFunc } from "../../../../common/translations/localize";
import { EventAction } from "../../../../data/script";

interface Props {
  index: number;
  action: EventAction;
  localize: LocalizeFunc;
  onChange: (index: number, action: EventAction) => void;
}

export default class EventActionForm extends Component<Props> {
  private onChange: (event: Event) => void;

  static get defaultConfig(): EventAction {
    return {
      event: "",
      event_data: {},
    };
  }

  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "action");
    this.serviceDataChanged = this.serviceDataChanged.bind(this);
  }

  public render() {
    const {
      action: { event, event_data },
      localize,
    } = this.props;
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

  private serviceDataChanged(eventData) {
    this.props.onChange(this.props.index, {
      ...this.props.action,
      event_data: eventData,
    });
  }
}
