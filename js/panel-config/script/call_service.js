import { h, Component } from 'preact';

import JSONTextArea from '../json_textarea.js';

export default class CallServiceAction extends Component {
  constructor() {
    super();

    this.serviceChanged = this.serviceChanged.bind(this);
    this.serviceDataChanged = this.serviceDataChanged.bind(this);
  }

  serviceChanged(ev) {
    this.props.onChange(this.props.index, {
      ...this.props.action,
      service: ev.target.value,
    });
  }

  serviceDataChanged(data) {
    this.props.onChange(this.props.index, {
      ...this.props.action,
      data,
    });
  }

  render({ action, hass }) {
    const { service, data } = action;

    return (
      <div>
        <ha-service-picker
          hass={hass}
          value={service}
          onChange={this.serviceChanged}
        />
        <JSONTextArea
          label="Service Data"
          value={data}
          onChange={this.serviceDataChanged}
        />
      </div>
    );
  }
}

CallServiceAction.configKey = 'service';
CallServiceAction.defaultConfig = {
  alias: '',
  service: '',
  data: {}
};
