import { h, Component } from 'preact';

import ActionRow from './action_row.js';

export default class Script extends Component {
  constructor() {
    super();

    this.addAction = this.addAction.bind(this);
    this.actionChanged = this.actionChanged.bind(this);
  }

  addAction() {
    const script = this.props.script.concat({
      service: '',
    });

    this.props.onChange(script);
  }

  actionChanged(index, newValue) {
    const script = this.props.script.concat();

    if (newValue === null) {
      script.splice(index, 1);
    } else {
      script[index] = newValue;
    }

    this.props.onChange(script);
  }

  render({ script, hass }) {
    return (
      <div class="script">
        {script.map((act, idx) => (
          <ActionRow
            index={idx}
            action={act}
            onChange={this.actionChanged}
            hass={hass}
          />))}
        <paper-card>
          <div class='card-actions add-card'>
            <paper-button onTap={this.addAction}>Add action</paper-button>
          </div>
        </paper-card>
      </div>
    );
  }
}
