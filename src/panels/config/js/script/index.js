import { h, Component } from "preact";
import "@polymer/paper-card/paper-card";
import "@material/mwc-button";

import ActionRow from "./action_row";

export default class Script extends Component {
  constructor() {
    super();

    this.addAction = this.addAction.bind(this);
    this.actionChanged = this.actionChanged.bind(this);
  }

  addAction() {
    const script = this.props.script.concat({
      service: "",
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

  render({ script, hass, localize }) {
    return (
      <div class="script">
        {script.map((act, idx) => (
          <ActionRow
            index={idx}
            action={act}
            onChange={this.actionChanged}
            hass={hass}
            localize={localize}
          />
        ))}
        <paper-card>
          <div class="card-actions add-card">
            <mwc-button onTap={this.addAction}>
              {localize("ui.panel.config.automation.editor.actions.add")}
            </mwc-button>
          </div>
        </paper-card>
      </div>
    );
  }
}
