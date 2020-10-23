import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResultArray,
  customElement,
  html,
  internalProperty,
  LitElement,
  TemplateResult,
} from "lit-element";

import { fireEvent } from "../../common/dom/fire_event";
import { computeStateName } from "../../common/entity/compute_state_name";
import { createCloseHeading } from "../../components/ha-dialog";
import { ActionConfig, ActionHandlerEvent } from "../../data/lovelace";
import { handleAction } from "../../panels/lovelace/common/handle-action";
import { haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
import { HassDialog } from "../make-dialog-manager";
import { HaActionListDialogParams } from "./show-action-list";

@customElement("dialog-action-list")
class ActionListDialog extends LitElement
  implements HassDialog<HaActionListDialogParams> {
  public hass!: HomeAssistant;

  @internalProperty() private _params?: HaActionListDialogParams;

  public showDialog(params: HaActionListDialogParams): void {
    this._params = params;
  }

  public closeDialog() {
    this._params = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }

    const stateObj = this._params.entity
      ? this.hass.states[this._params.entity]
      : undefined;
    const name = stateObj ? computeStateName(stateObj) : undefined;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        scrimClickAction
        escapeKeyAction
        hideActions
        .heading=${createCloseHeading(
          this.hass,
          this._params.name ||
            name ||
            this.hass.localize("ui.dialogs.action_list.title")
        )}
      >
        <div>
          ${this._params.actions.map(
            (action) =>
              html`
                <div>
                  <mwc-button
                    @click=${this._handleAction}
                    .config=${action}
                    tabindex="1"
                  >
                    ${action.name}
                  </mwc-button>
                </div>
              `
          )}
        </div>
      </ha-dialog>
    `;
  }

  private _handleAction(ev: ActionHandlerEvent) {
    this.closeDialog();
    const config = (ev.currentTarget as any).config as ActionConfig;
    handleAction(
      this,
      this.hass!,
      { entity: this._params?.entity, tap_action: config },
      "tap"
    );
  }

  static get styles(): CSSResultArray {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-max-width: 500px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-action-list": ActionListDialog;
  }
}
