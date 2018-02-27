import { h, Component } from 'preact';

import { onChangeEvent } from '../../common/util/event.js';

export default class TimeCondition extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'condition');
  }

  /* eslint-disable camelcase */
  render({ condition, localize }) {
    const { after, before } = condition;
    return (
      <div>
        <paper-input
          label={localize('ui.panel.config.automation.editor.conditions.type.time.after')}
          name="after"
          value={after}
          onvalue-changed={this.onChange}
        />
        <paper-input
          label={localize('ui.panel.config.automation.editor.conditions.type.time.before')}
          name="before"
          value={before}
          onvalue-changed={this.onChange}
        />
      </div>
    );
  }
}

TimeCondition.defaultConfig = {
};
