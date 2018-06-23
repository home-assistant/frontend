import { h, Component } from 'preact';

import '@polymer/paper-input/paper-textarea.js';

import { onChangeEvent } from '../../../../common/preact/event.js';

export default class TemplateTrigger extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'trigger');
  }

  render({ trigger, localize }) {
    /* eslint-disable camelcase */
    const { value_template } = trigger;
    return (
      <div>
        <paper-textarea
          label={localize('ui.panel.config.automation.editor.triggers.type.template.value_template')}
          name="value_template"
          value={value_template}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

TemplateTrigger.defaultConfig = {
  value_template: '',
};
