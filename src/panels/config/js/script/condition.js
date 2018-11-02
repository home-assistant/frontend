import { h, Component } from "preact";

import StateCondition from "../condition/state";
import ConditionEdit from "../condition/condition_edit";

export default class ConditionAction extends Component {
  // eslint-disable-next-line
  render({ action, index, onChange, hass, localize }) {
    return (
      <ConditionEdit
        condition={action}
        onChange={onChange}
        index={index}
        hass={hass}
        localize={localize}
      />
    );
  }
}

ConditionAction.defaultConfig = Object.assign(
  { condition: "state" },
  StateCondition.defaultConfig
);
