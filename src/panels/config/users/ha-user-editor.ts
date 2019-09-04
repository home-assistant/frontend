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

  protected render(): TemplateResult | void {
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
              <td>ID</td>
              <td>${user.id}</td>
            </tr>
            <tr>
              <td>Owner</td>
              <td>${user.is_owner}</td>
            </tr>
            <tr>
              <td>Group</td>
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
              <td>Active</td>
              <td>${user.is_active}</td>
            </tr>
            <tr>
              <td>System generated</td>
              <td>${user.system_generated}</td>
            </tr>
          </table>

          <div class="card-actions">
            <mwc-button @click=${this._handleRenameUser}>
              ${hass.localize("ui.panel.config.users.editor.rename_user")}
            </mwc-button>
            <mwc-button
              class="warning"
              @click=${this._deleteUser}
              .disabled=${user.system_generated}
            >
              ${hass.localize("ui.panel.config.users.editor.delete_user")}
            </mwc-button>
            ${user.system_generated
              ? html`
                  Unable to remove system generated users.
                `
              : ""}
          </div>
        </ha-card>
      </hass-subpage>
    `;
  }

  private get _name() {
    return this.user && (this.user.name || "Unnamed user");
  }

  private async _handleRenameUser(ev): Promise<void> {
    ev.currentTarget.blur();
    const newName = prompt("New name?", this.user!.name);
    if (newName === null || newName === this.user!.name) {
      return;
    }

    try {
      await updateUser(this.hass!, this.user!.id, {
        name: newName,
      });
      fireEvent(this, "reload-users");
    } catch (err) {
      alert(`User rename failed: ${err.message}`);
    }
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
      alert(`Group update failed: ${err.message}`);
      selectEl.value = this.user!.group_ids[0];
    }
  }

  private async _deleteUser(ev): Promise<void> {
    if (!confirm(`Are you sure you want to delete ${this._name}`)) {
      ev.target.blur();
      return;
    }
    try {
      await deleteUser(this.hass!, this.user!.id);
    } catch (err) {
      alert(err.code);
      return;
    }
    fireEvent(this, "reload-users");
    navigate(this, "/config/users");
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
