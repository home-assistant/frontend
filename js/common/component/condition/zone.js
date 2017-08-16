import { h, Component } from 'preact';

import { onChangeEvent } from '../../util/event';

export default class ZoneCondition extends Component {
  constructor() {
    super();

    this.onChange = onChangeEvent.bind(this, 'condition');
  }

  /* eslint-disable camelcase */
  render({ condition }) {
    const { entity_id, zone } = condition;
    return (
      <div>
        <paper-input
          label="Entity Id"
          name="entity_id"
          value={entity_id}
          onChange={this.onChange}
        />
        <paper-input
          label="Zone entity id"
          name="zone"
          value={zone}
          onChange={this.onChange}
        />
      </div>
    );
  }
}

ZoneCondition.defaultConfig = {
  entity_id: '',
  zone: '',
};
