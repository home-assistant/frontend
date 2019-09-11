import { h, Component } from "preact";
import "@polymer/paper-input/paper-input";

import { onChangeEvent } from "../../../../common/preact/event";

export default class MQTTTrigger extends Component<any> {
  private onChange: (obj: any) => void;
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "trigger");
  }

  /* eslint-disable camelcase */
  public render({ trigger, localize }) {
    const { topic, payload } = trigger;
    return (
      <div>
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.mqtt.topic"
          )}
          name="topic"
          value={topic}
          onvalue-changed={this.onChange}
        />
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.mqtt.payload"
          )}
          name="payload"
          value={payload}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

(MQTTTrigger as any).defaultConfig = {
  topic: "",
};
