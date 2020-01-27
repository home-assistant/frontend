import {
  LitElement,
  TemplateResult,
  html,
  customElement,
  CSSResultArray,
  css,
  property,
} from "lit-element";
import { until } from "lit-html/directives/until";
import "@material/mwc-button";

import "../../../layouts/hass-subpage";
import { haStyle } from "../../../resources/styles";
import "../../../components/ha-card";
import { HomeAssistant } from "../../../types";
import { fireEvent } from "../../../common/dom/fire_event";
import { navigate } from "../../../common/navigate";
import {
  User,
  deleteUser,
  updateUser,
  SYSTEM_GROUP_ID_USER,
  SYSTEM_GROUP_ID_ADMIN,
} from "../../../data/user";
import { showSaveSuccessToast } from "../../../util/toast-saved-success";
import {
  showAlertDialog,
  showConfirmationDialog,
  showPromptDialog,
} from "../../../dialogs/generic/show-dialog-box";

declare global {
  interface HASSDomEvents {
    "reload-users": undefined;
  }
}

const GROUPS = [SYSTEM_GROUP_ID_USER, SYSTEM_GROUP_ID_ADMIN];

@customElement("ha-user-editor")
class HaUserEditor extends LitElement {
  @property() public hass?: HomeAssistant;
  @property() public user?: User;

  protected render(): TemplateResult {
    const hass = this.hass;
    const user = this.user;
    if (!hass || !user) {
      return html``;
    }

    return html`
      <hass-subpage
        .header=${hass.localize("ui.panel.config.users.editor.caption")}
      >
        <ha-card .header=${this._name}>
          <table class="card-content">
            <tr>
              <td>${hass.localize("ui.panel.config.users.editor.id")}</td>
              <td>${user.id}</td>
            </tr>
            <tr>
              <td>${hass.localize("ui.panel.config.users.editor.owner")}</td>
              <td>${user.is_owner}</td>
            </tr>
            <tr>
              <td>${hass.localize("ui.panel.config.users.editor.group")}</td>
              <td>
                <select
                  @change=${this._handleGroupChange}
                  .value=${until(
                    this.updateComplete.then(() => user.group_ids[0])
                  )}
                >
                  ${GROUPS.map(
                    (groupId) => html`
                      <option value=${groupId}>
                        ${hass.localize(`groups.${groupId}`)}
                      </option>
                    `
                  )}
                </select>
              </td>
            </tr>
            ${user.group_ids[0] === SYSTEM_GROUP_ID_USER
              ? html`
                  <tr>
                    <td colspan="2" class="user-experiment">
                      The users group is a work in progress. The user will be
                      unable to administer the instance via the UI. We're still
                      auditing all management API endpoints to ensure that they
                      correctly limit access to administrators.
                    </td>
                  </tr>
                `
              : ""}

            <tr>
              <td>${hass.localize("ui.panel.config.users.editor.active")}</td>
              <td>${user.is_active}</td>
            </tr>
            <tr>
              <td>
                ${hass.localize(
                  "ui.panel.config.users.editor.system_generated"
                )}
              </td>
              <td>${user.system_generated}</td>
            </tr>
          </table>

          <div class="card-actions">
            <mwc-button @click=${this._handlePromptRenameUser}>
              ${hass.localize("ui.panel.config.users.editor.rename_user")}
            </mwc-button>
            <mwc-button
              class="warning"
              @click=${this._promptDeleteUser}
              .disabled=${user.system_generated}
            >
              ${hass.localize("ui.panel.config.users.editor.delete_user")}
            </mwc-button>
            ${user.system_generated
              ? html`
                  ${hass.localize(
                    "ui.panel.config.users.editor.system_generated_users_not_removable"
                  )}
                `
              : ""}
          </div>
        </ha-card>
      </hass-subpage>
    `;
  }

  private get _name() {
    return (
      this.user &&
      (this.user.name ||
        this.hass!.localize("ui.panel.config.users.editor.unnamed_user"))
    );
  }

  private async _handleRenameUser(newName?: string) {
    if (newName === null || newName === this.user!.name) {
      return;
    }

    try {
      await updateUser(this.hass!, this.user!.id, {
        name: newName,
      });
      fireEvent(this, "reload-users");
    } catch (err) {
      showAlertDialog(this, {
        text: `${this.hass!.localize(
          "ui.panel.config.users.editor.user_rename_failed"
        )} ${err.message}`,
      });
    }
  }

  private async _handlePromptRenameUser(ev): Promise<void> {
    ev.currentTarget.blur();
    showPromptDialog(this, {
      title: this.hass!.localize("ui.panel.config.users.editor.enter_new_name"),
      defaultValue: this.user!.name,
      inputLabel: this.hass!.localize("ui.panel.config.users.add_user.name"),
      confirm: (text) => this._handleRenameUser(text),
    });
  }

  private async _handleGroupChange(ev): Promise<void> {
    const selectEl = ev.currentTarget as HTMLSelectElement;
    const newGroup = selectEl.value;
    try {
      await updateUser(this.hass!, this.user!.id, {
        group_ids: [newGroup],
      });
      showSaveSuccessToast(this, this.hass!);
      fireEvent(this, "reload-users");
    } catch (err) {
      showAlertDialog(this, {
        text: `${this.hass!.localize(
          "ui.panel.config.users.editor.group_update_failed"
        )} ${err.message}`,
      });
      selectEl.value = this.user!.group_ids[0];
    }
  }

  private async _deleteUser() {
    try {
      await deleteUser(this.hass!, this.user!.id);
    } catch (err) {
      showAlertDialog(this, {
        text: err.code,
      });
      return;
    }
    fireEvent(this, "reload-users");
    navigate(this, "/config/users");
  }

  private async _promptDeleteUser(_ev): Promise<void> {
    showConfirmationDialog(this, {
      text: this.hass!.localize(
        "ui.panel.config.users.editor.confirm_user_deletion",
        "name",
        this._name
      ),
      confirm: () => this._deleteUser(),
    });
  }

  static get styles(): CSSResultArray {
    return [
      haStyle,
      css`
        .card-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        ha-card {
          max-width: 600px;
          margin: 0 auto 16px;
        }
        hass-subpage ha-card:first-of-type {
          direction: ltr;
        }
        table {
          width: 100%;
        }
        td {
          vertical-align: top;
        }
        .user-experiment {
          padding: 8px 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-user-editor": HaUserEditor;
  }
}
