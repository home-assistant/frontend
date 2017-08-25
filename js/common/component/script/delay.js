import { h, Component } from 'preact';
import { onChangeEvent } from '../../util/event';

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
          onChange={this.onChange}
        />
      </div>
    );
  }
}

DelayAction.configKey = 'delay';
DelayAction.defaultConfig = {
  delay: '',
};
