import { h, Component } from "preact";
import "@polymer/paper-menu-button/paper-menu-button";
import "@polymer/paper-icon-button/paper-icon-button";
import "@polymer/paper-item/paper-item";
import "@polymer/paper-listbox/paper-listbox";
import "../../../../components/ha-card";

import ActionEdit from "./action_edit";

export default class Action extends Component<any> {
  public state: { yamlMode: boolean };
  constructor() {
    super();

    this.state = {
      yamlMode: false,
    };

    this.onDelete = this.onDelete.bind(this);
    this.switchYamlMode = this.switchYamlMode.bind(this);
  }

  public onDelete() {
    // eslint-disable-next-line
    if (
      confirm(
        this.props.localize(
          "ui.panel.config.automation.editor.actions.delete_confirm"
        )
      )
    ) {
      this.props.onChange(this.props.index, null);
    }
  }

  public render(props, { yamlMode }) {
    return (
      <ha-card>
        <div class="card-content">
          <div class="card-menu" style="z-index: 3">
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
                <paper-item onTap={this.switchYamlMode}>
                  {yamlMode
                    ? props.localize(
                        "ui.panel.config.automation.editor.edit_ui"
                      )
                    : props.localize(
                        "ui.panel.config.automation.editor.edit_yaml"
                      )}
                </paper-item>
                <paper-item disabled>
                  {props.localize(
                    "ui.panel.config.automation.editor.actions.duplicate"
                  )}
                </paper-item>
                <paper-item onTap={this.onDelete}>
                  {props.localize(
                    "ui.panel.config.automation.editor.actions.delete"
                  )}
                </paper-item>
              </paper-listbox>
            </paper-menu-button>
          </div>
          <ActionEdit {...props} yamlMode={yamlMode} />
        </div>
      </ha-card>
    );
  }

  private switchYamlMode() {
    this.setState({
      yamlMode: !this.state.yamlMode,
    });
  }
}
