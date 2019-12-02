import { h, Component } from "preact";
import "@material/mwc-button";
import "../../../../components/ha-card";

import ActionRow from "./action_row";

export default class Script extends Component<any> {
  constructor() {
    super();

    this.addAction = this.addAction.bind(this);
    this.actionChanged = this.actionChanged.bind(this);
    this.moveUp = this.moveUp.bind(this);
    this.moveDown = this.moveDown.bind(this);
  }

  public addAction() {
    const script = this.props.script.concat({
      service: "",
    });

    this.props.onChange(script);
  }

  public actionChanged(index, newValue) {
    const script = this.props.script.concat();

    if (newValue === null) {
      script.splice(index, 1);
    } else {
      script[index] = newValue;
    }

    this.props.onChange(script);
  }

  public moveUp(index) {
    const script = this.props.script.concat();
    const action = script.splice(index, 1)[0];
    script.splice(index - 1, 0, action);
    this.props.onChange(script);
  }

  public moveDown(index) {
    const script = this.props.script.concat();
    const action = script.splice(index, 1)[0];
    script.splice(index + 1, 0, action);
    this.props.onChange(script);
  }

  public render({ script, hass, localize }) {
    return (
      <div class="script">
        {script.map((act, idx) => (
          <ActionRow
            index={idx}
            length={script.length}
            action={act}
            onChange={this.actionChanged}
            moveUp={this.moveUp}
            moveDown={this.moveDown}
            hass={hass}
            localize={localize}
          />
        ))}
        <ha-card>
          <div class="card-actions add-card">
            <mwc-button onTap={this.addAction}>
              {localize("ui.panel.config.automation.editor.actions.add")}
            </mwc-button>
          </div>
        </ha-card>
      </div>
    );
  }
}
