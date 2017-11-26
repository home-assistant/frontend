import { h, Component } from 'preact';

import StateCondition from '../condition/state.js';
import ConditionEdit from '../condition/condition_edit.js';

export default class ConditionAction extends Component {
  // eslint-disable-next-line
  render({ action, index, onChange, hass }) {
    return (
      <ConditionEdit
        condition={action}
        onChange={onChange}
        index={index}
        hass={hass}
      />
    );
  }
}

ConditionAction.configKey = 'condition';
ConditionAction.defaultConfig = {
  condition: 'state',
  ...StateCondition.defaultConfig,
};
