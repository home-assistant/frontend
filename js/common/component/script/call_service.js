import { h, Component } from 'preact';

import JSONTextArea from '../json_textarea';
import { onChangeEvent } from '../../util/event';

export default class CallServiceAction extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'action');
    this.serviceDataChanged = this.serviceDataChanged.bind(this);
  }

  serviceDataChanged(data) {
    this.props.onChange(this.props.index, {
      ...this.props.action,
      data,
    });
  }

  render({ action }) {
    const { alias, service, data } = action;
    return (
      <div>
        <paper-input
          label="Alias"
          name="alias"
          value={alias}
          onChange={this.onChange}
        />
        <paper-input
          label="Service"
          name="service"
          value={service}
          onChange={this.onChange}
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
