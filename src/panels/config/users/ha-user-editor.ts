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
import { User, deleteUser, updateUser } from "../../../data/user";

declare global {
  interface HASSDomEvents {
    "reload-users": undefined;
  }
}

const GROUPS = ["system-users", "system-admin"];

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

  private async _handleGroupChange(ev): Promise<void> {
    const selectEl = ev.currentTarget as HTMLSelectElement;
    const newGroup = selectEl.value;
    try {
      await updateUser(this.hass!, this.user!.id, {
        group_ids: [newGroup],
      });
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
        ha-card {
          display: block;
          max-width: 600px;
          margin: 0 auto 16px;
        }
        ha-card:first-child {
          margin-top: 16px;
        }
        ha-card:last-child {
          margin-bottom: 16px;
        }
        .card-content {
          padding: 0 16px 16px;
        }
        .card-actions {
          padding: 0 8px;
        }
        hass-subpage ha-card:first-of-type {
          direction: ltr;
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
