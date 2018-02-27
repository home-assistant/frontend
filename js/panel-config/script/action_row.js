import { h, Component } from 'preact';

import ActionEdit from './action_edit.js';

export default class Action extends Component {
  constructor() {
    super();

    this.onDelete = this.onDelete.bind(this);
  }

  onDelete() {
    // eslint-disable-next-line
    if (confirm(this.props.localize('ui.panel.config.automation.editor.actions.delete_confirm'))) {
      this.props.onChange(this.props.index, null);
    }
  }

  render(props) {
    return (
      <paper-card>
        <div class='card-menu'>
          <paper-menu-button
            no-animations
            horizontal-align="right"
            horizontal-offset="-5"
            vertical-offset="-5"
          >
            <paper-icon-button
              icon="mdi:dots-vertical"
              slot="dropdown-trigger"
            />
            <paper-listbox slot="dropdown-content">
              <paper-item disabled>{props.localize('ui.panel.config.automation.editor.actions.duplicate')}</paper-item>
              <paper-item onTap={this.onDelete}>{props.localize('ui.panel.config.automation.editor.actions.delete')}</paper-item>
            </paper-listbox>
          </paper-menu-button>
        </div>
        <div class='card-content'>
          <ActionEdit {...props} />
        </div>
      </paper-card>
    );
  }
}
