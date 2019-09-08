import { h, Component } from "preact";

import StateCondition from "../condition/state";
import ConditionEdit from "../condition/condition_edit";

export default class ConditionAction extends Component<any> {
  // eslint-disable-next-line
  public render({ action, index, onChange, hass, localize }) {
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

(ConditionAction as any).defaultConfig = {
  condition: "state",
  ...(StateCondition as any).defaultConfig,
};
