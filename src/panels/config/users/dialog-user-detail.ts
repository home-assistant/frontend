import "@material/mwc-button";
import "@polymer/paper-input/paper-input";
import "@polymer/paper-tooltip/paper-tooltip";
import {
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
  css,
} from "lit-element";
import "../../../components/entity/ha-entities-picker";
import "../../../components/user/ha-user-picker";
import { PolymerChangedEvent } from "../../../polymer-types";
import { haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { UserDetailDialogParams } from "./show-dialog-user-detail";
import { createCloseHeading } from "../../../components/ha-dialog";
import { GROUPS, SYSTEM_GROUP_ID_USER } from "../../../data/user";

@customElement("dialog-user-detail")
class DialogUserDetail extends LitElement {
  @property() public hass!: HomeAssistant;
  @property() private _name!: string;
  @property() private _group?: string;
  @property() private _error?: string;
  @property() private _params?: UserDetailDialogParams;
  @property() private _submitting: boolean = false;

  public async showDialog(params: UserDetailDialogParams): Promise<void> {
    this._params = params;
    this._error = undefined;
    this._name = params.entry.name || "";
    this._group = params.entry.group_ids[0];
    await this.updateComplete;
  }

  protected render(): TemplateResult {
    if (!this._params) {
      return html``;
    }
    const user = this._params.entry;
    return html`
      <ha-dialog
        open
        @closing=${this._close}
        scrimClickAction
        escapeKeyAction
        .heading=${createCloseHeading(this.hass, user.name)}
      >
        <div>
          ${this._error
            ? html`
                <div class="error">${this._error}</div>
              `
            : ""}
          <div class="form">
            <paper-input
              .value=${this._name}
              @value-changed=${this._nameChanged}
              label="${this.hass!.localize("ui.panel.config.user.editor.name")}"
            ></paper-input>
            <ha-paper-dropdown-menu
              .label=${this.hass.localize("ui.panel.config.users.editor.group")}
            >
              <paper-listbox
                slot="dropdown-content"
                .selected=${this._group}
                @iron-select=${this._handleGroupChange}
                attr-for-selected="group-id"
              >
                ${GROUPS.map(
                  (groupId) => html`
                    <paper-item group-id=${groupId}>
                      ${this.hass.localize(`groups.${groupId}`)}
                    </paper-item>
                  `
                )}
              </paper-listbox>
            </ha-paper-dropdown-menu>
            ${this._group === SYSTEM_GROUP_ID_USER
              ? html`
                  <br />
                  The users group is a work in progress. The user will be unable
                  to administer the instance via the UI. We're still auditing
                  all management API endpoints to ensure that they correctly
                  limit access to administrators.
                `
              : ""}
            <table>
              <tr>
                <td>
                  ${this.hass.localize("ui.panel.config.users.editor.id")}
                </td>
                <td>${user.id}</td>
              </tr>
              <tr>
                <td>
                  ${this.hass.localize("ui.panel.config.users.editor.owner")}
                </td>
                <td>${user.is_owner}</td>
              </tr>
              <tr>
                <td>
                  ${this.hass.localize("ui.panel.config.users.editor.active")}
                </td>
                <td>${user.is_active}</td>
              </tr>
              <tr>
                <td>
                  ${this.hass.localize(
                    "ui.panel.config.users.editor.system_generated"
                  )}
                </td>
                <td>${user.system_generated}</td>
              </tr>
            </table>
          </div>
        </div>

        <div slot="secondaryAction">
          <mwc-button
            class="warning"
            @click=${this._deleteEntry}
            .disabled=${this._submitting || user.system_generated}
          >
            ${this.hass!.localize("ui.panel.config.users.editor.delete_user")}
          </mwc-button>
          ${user.system_generated
            ? html`
                <paper-tooltip position="right"
                  >${this.hass.localize(
                    "ui.panel.config.users.editor.system_generated_users_not_removable"
                  )}</paper-tooltip
                >
              `
            : ""}
        </div>
        <mwc-button
          slot="primaryAction"
          @click=${this._updateEntry}
          .disabled=${!this._name}
        >
          ${this.hass!.localize("ui.panel.config.users.editor.update_user")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _nameChanged(ev: PolymerChangedEvent<string>) {
    this._error = undefined;
    this._name = ev.detail.value;
  }

  private async _handleGroupChange(ev): Promise<void> {
    this._group = ev.detail.item.getAttribute("group-id");
  }

  private async _updateEntry() {
    this._submitting = true;
    try {
      await this._params!.updateEntry({
        name: this._name.trim(),
        group_ids: [this._group!],
      });
      this._close();
    } catch (err) {
      this._error = err ? err.message : "Unknown error";
    } finally {
      this._submitting = false;
    }
  }

  private async _deleteEntry() {
    this._submitting = true;
    try {
      if (await this._params!.removeEntry()) {
        this._params = undefined;
      }
    } finally {
      this._submitting = false;
    }
  }

  private _close(): void {
    this._params = undefined;
  }

  static get styles(): CSSResult[] {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --mdc-dialog-min-width: 500px;
        }
        table {
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-user-detail": DialogUserDetail;
  }
}
