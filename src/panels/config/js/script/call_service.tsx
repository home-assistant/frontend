import { h, Component } from "preact";
import "../../../../components/ha-service-picker";

import JSONTextArea from "../json_textarea";

export default class CallServiceAction extends Component<any> {
  constructor() {
    super();

    this.serviceChanged = this.serviceChanged.bind(this);
    this.serviceDataChanged = this.serviceDataChanged.bind(this);
  }

  public serviceChanged(ev) {
    this.props.onChange(this.props.index, {
      ...this.props.action,
      service: ev.target.value,
    });
  }

  public serviceDataChanged(data) {
    this.props.onChange(this.props.index, { ...this.props.action, data });
  }

  public render({ action, hass, localize }) {
    const { service, data } = action;

    return (
      <div>
        <ha-service-picker
          hass={hass}
          value={service}
          onChange={this.serviceChanged}
        />
        <JSONTextArea
          label={localize(
            "ui.panel.config.automation.editor.actions.type.service.service_data"
          )}
          value={data}
          onChange={this.serviceDataChanged}
        />
      </div>
    );
  }
}

(CallServiceAction as any).defaultConfig = {
  alias: "",
  service: "",
  data: {},
};
