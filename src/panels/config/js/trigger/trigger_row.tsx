import { h, Component } from "preact";
import "@polymer/paper-menu-button/paper-menu-button";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "../../../../components/ha-card";

import TriggerEdit from "./trigger_edit";

export default class TriggerRow extends Component<any> {
  public state: { yaml: boolean };
  constructor() {
    super();

    this.state = {
      yaml: false,
    };

    this.onDelete = this.onDelete.bind(this);
    this.switchYaml = this.switchYaml.bind(this);
  }

  public render(props, { yaml }) {
    const menuStyle: any = {
      zIndex: 3,
    };
    return (
      <ha-card>
        <div class="card-content">
          <div class="card-menu" style={menuStyle}>
            <paper-menu-button
              no-animations
              horizontal-align="right"
              horizontal-offset="-5"
              vertical-offset="-5"
              close-on-activate
            >
              <paper-icon-button
                icon="hass:dots-vertical"
                slot="dropdown-trigger"
              />
              <paper-listbox slot="dropdown-content">
                <paper-item onTap={this.switchYaml}>
                  {yaml ? "Edit with UI" : "Edit as YAML"}
                </paper-item>
                <paper-item disabled>
                  {props.localize(
                    "ui.panel.config.automation.editor.triggers.duplicate"
                  )}
                </paper-item>
                <paper-item onTap={this.onDelete}>
                  {props.localize(
                    "ui.panel.config.automation.editor.triggers.delete"
                  )}
                </paper-item>
              </paper-listbox>
            </paper-menu-button>
          </div>
          <TriggerEdit {...props} yaml={yaml} />
        </div>
      </ha-card>
    );
  }

  private onDelete() {
    // eslint-disable-next-line
    if (
      confirm(
        this.props.localize(
          "ui.panel.config.automation.editor.triggers.delete_confirm"
        )
      )
    ) {
      this.props.onChange(this.props.index, null);
    }
  }

  private switchYaml() {
    this.setState({
      yaml: !this.state.yaml,
    });
  }
}
