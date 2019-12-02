import { h } from "preact";

import "@polymer/paper-input/paper-input";

import { onChangeEvent } from "../../../../common/preact/event";
import { AutomationComponent } from "../automation-component";

export default class WebhookTrigger extends AutomationComponent<any> {
  private onChange: (obj: any) => void;
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, "trigger");
  }

  public render({ trigger, localize }) {
    const { webhook_id: webhookId } = trigger;
    return (
      <div>
        <paper-input
          label={localize(
            "ui.panel.config.automation.editor.triggers.type.webhook.webhook_id"
          )}
          name="webhook_id"
          value={webhookId}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

(WebhookTrigger as any).defaultConfig = {
  webhook_id: "",
};
