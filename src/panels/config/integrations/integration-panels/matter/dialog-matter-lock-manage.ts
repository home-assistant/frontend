import { mdiDelete, mdiLock, mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/ha-wa-dialog";
import type {
  MatterLockInfo,
  MatterLockUser,
} from "../../../../../data/matter-lock";
import {
  getMatterLockInfo,
  getMatterLockUsers,
  clearMatterLockUser,
} from "../../../../../data/matter-lock";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { MatterLockManageDialogParams } from "./show-dialog-matter-lock-manage";
import { showMatterLockUserEditDialog } from "./show-dialog-matter-lock-user-edit";

@customElement("dialog-matter-lock-manage")
class DialogMatterLockManage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _entityId?: string;

  @state() private _lockInfo?: MatterLockInfo;

  @state() private _users: MatterLockUser[] = [];

  @state() private _loading = true;

  @state() private _open = false;

  public async showDialog(params: MatterLockManageDialogParams): Promise<void> {
    this._entityId = params.entity_id;
    this._loading = true;
    this._open = true;
    await this._fetchData();
  }

  private async _fetchData(): Promise<void> {
    if (!this._entityId) {
      return;
    }

    try {
      this._lockInfo = await getMatterLockInfo(this.hass, this._entityId);

      if (this._lockInfo.supports_user_management) {
        const usersResponse = await getMatterLockUsers(
          this.hass,
          this._entityId
        );
        this._users = usersResponse.users;
      }
    } catch (err: unknown) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.matter.lock.errors.load_failed"
        ),
        text: (err as Error).message,
      });
    } finally {
      this._loading = false;
    }
  }

  protected render() {
    if (!this._entityId) {
      return nothing;
    }

    return html`
      <ha-wa-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.matter.lock.dialog_title"
        )}
        @closed=${this._dialogClosed}
      >
        ${this._loading
          ? html`<div class="center">
              <ha-spinner></ha-spinner>
            </div>`
          : html`<div class="content">${this._renderUsers()}</div>`}
      </ha-wa-dialog>
    `;
  }

  private _renderUsers() {
    const occupiedUsers = this._users.filter(
      (u) => u.user_status !== "available"
    );

    return html`
      <div class="users-content">
        ${occupiedUsers.length === 0
          ? html`<p class="empty">
              ${this.hass.localize(
                "ui.panel.config.matter.lock.users.no_users"
              )}
            </p>`
          : html`
              <ha-md-list>
                ${occupiedUsers.map(
                  (user) => html`
                    <ha-md-list-item
                      type="button"
                      .user=${user}
                      @click=${this._handleUserClick}
                    >
                      <div slot="start" class="icon-background">
                        <ha-svg-icon .path=${mdiLock}></ha-svg-icon>
                      </div>
                      <div slot="headline">
                        ${user.user_name || `User ${user.user_index}`}
                      </div>
                      <div slot="supporting-text">
                        ${this.hass.localize(
                          `ui.panel.config.matter.lock.users.user_type.${user.user_type}`
                        )}
                        ${user.credentials.length > 0
                          ? ` - ${user.credentials.length} ${this.hass.localize("ui.panel.config.matter.lock.users.credentials").toLowerCase()}`
                          : ""}
                      </div>
                      <ha-icon-button
                        slot="end"
                        .path=${mdiDelete}
                        .user=${user}
                        @click=${this._handleDeleteUserClick}
                      ></ha-icon-button>
                    </ha-md-list-item>
                  `
                )}
              </ha-md-list>
            `}
        <div class="actions">
          <ha-button @click=${this._addUser}>
            <ha-svg-icon slot="icon" .path=${mdiPlus}></ha-svg-icon>
            ${this.hass.localize("ui.panel.config.matter.lock.users.add")}
          </ha-button>
        </div>
      </div>
    `;
  }

  private _handleUserClick(ev: Event): void {
    const user = (ev.currentTarget as any).user as MatterLockUser;
    this._editUser(user);
  }

  private _handleDeleteUserClick(ev: Event): void {
    ev.stopPropagation();
    const user = (ev.currentTarget as any).user as MatterLockUser;
    this._deleteUser(user);
  }

  private _addUser(): void {
    showMatterLockUserEditDialog(this, {
      entity_id: this._entityId!,
      lockInfo: this._lockInfo!,
      onSaved: () => this._fetchData(),
    });
  }

  private _editUser(user: MatterLockUser): void {
    showMatterLockUserEditDialog(this, {
      entity_id: this._entityId!,
      lockInfo: this._lockInfo!,
      user,
      onSaved: () => this._fetchData(),
    });
  }

  private async _deleteUser(user: MatterLockUser): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.panel.config.matter.lock.users.delete"),
      text: this.hass.localize(
        "ui.panel.config.matter.lock.confirm_delete_user",
        {
          name: user.user_name || `User ${user.user_index}`,
        }
      ),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    try {
      await clearMatterLockUser(
        this.hass,
        this._entityId!,
        user.user_index as number
      );
      await this._fetchData();
    } catch (err: unknown) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.matter.lock.errors.save_failed"
        ),
        text: (err as Error).message,
      });
    }
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._entityId = undefined;
    this._lockInfo = undefined;
    this._users = [];
    this._loading = true;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-wa-dialog {
          --dialog-content-padding: 0;
        }
        .center {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--ha-space-6);
        }
        .content {
          min-height: 300px;
        }
        .users-content {
          padding: var(--ha-space-4) 0;
        }
        .empty {
          text-align: center;
          color: var(--secondary-text-color);
          padding: var(--ha-space-6);
        }
        .actions {
          padding: var(--ha-space-2) var(--ha-space-6);
          display: flex;
          justify-content: flex-end;
        }
        .icon-background {
          border-radius: var(--ha-border-radius-circle);
          background-color: var(--primary-color);
          color: #fff;
          display: flex;
          width: 40px;
          height: 40px;
          align-items: center;
          justify-content: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-matter-lock-manage": DialogMatterLockManage;
  }
}
