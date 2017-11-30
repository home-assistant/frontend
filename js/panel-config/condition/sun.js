import { h, Component } from 'preact';

import { onChangeEvent } from '../../common/util/event.js';

export default class SunCondition extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'condition');
    this.afterPicked = this.radioGroupPicked.bind(this, 'after');
    this.beforePicked = this.radioGroupPicked.bind(this, 'before');
  }

  radioGroupPicked(key, ev) {
    const condition = { ...this.props.condition };

    if (ev.target.selected) {
      condition[key] = ev.target.selected;
    } else {
      delete condition[key];
    }

    this.props.onChange(this.props.index, condition);
  }

  render({ condition }) {
    /* eslint-disable camelcase */
    const {
      after, after_offset, before, before_offset
    } = condition;
    return (
      <div>
        <label id="beforelabel">Before:</label>
        <paper-radio-group
          allow-empty-selection
          selected={before}
          aria-labelledby="beforelabel"
          onpaper-radio-group-changed={this.beforePicked}
        >
          <paper-radio-button name="sunrise">Sunrise</paper-radio-button>
          <paper-radio-button name="sunset">Sunset</paper-radio-button>
        </paper-radio-group>

        <paper-input
          label="Before offset (optional)"
          name="before_offset"
          value={before_offset}
          onvalue-changed={this.onChange}
          disabled={before === undefined}
        />

        <label id="afterlabel">After:</label>
        <paper-radio-group
          allow-empty-selection
          selected={after}
          aria-labelledby="afterlabel"
          onpaper-radio-group-changed={this.afterPicked}
        >
          <paper-radio-button name="sunrise">Sunrise</paper-radio-button>
          <paper-radio-button name="sunset">Sunset</paper-radio-button>
        </paper-radio-group>

        <paper-input
          label="After offset (optional)"
          name="after_offset"
          value={after_offset}
          onvalue-changed={this.onChange}
          disabled={after === undefined}
        />
      </div>
    );
  }
}

SunCondition.defaultConfig = {
};
