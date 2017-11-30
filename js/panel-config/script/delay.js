import { h, Component } from 'preact';
import { onChangeEvent } from '../../common/util/event.js';

export default class DelayAction extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'action');
  }

  render({ action }) {
    const { delay } = action;
    return (
      <div>
        <paper-input
          label="Delay"
          name="delay"
          value={delay}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

DelayAction.configKey = 'delay';
DelayAction.defaultConfig = {
  delay: '',
};
