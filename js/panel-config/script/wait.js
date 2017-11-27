import { h, Component } from 'preact';
import { onChangeEvent } from '../../common/util/event.js';

export default class WaitAction extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'action');
    this.onTemplateChange = this.onTemplateChange.bind(this);
  }

  // Gets fired on mount. If empty, onChangeEvent removes attribute.
  // Without the attribute this action is no longer matched to this component.
  onTemplateChange(ev) {
    this.props.onChange(this.props.index, {
      ...this.props.trigger,
      [ev.target.name]: ev.target.value,
    });
  }

  render({ action }) {
    /* eslint-disable camelcase */
    const { wait_template, timeout } = action;
    return (
      <div>
        <paper-textarea
          label="Wait Template"
          name="wait_template"
          value={wait_template}
          onvalue-changed={this.onTemplateChange}
        />
        <paper-input
          label="Timeout (Optional)"
          name="timeout"
          value={timeout}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

WaitAction.configKey = 'wait_template';
WaitAction.defaultConfig = {
  wait_template: '',
  timeout: '',
};
