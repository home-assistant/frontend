import { mdiAccountKey, mdiDelete, mdiDotsVertical, mdiPlus } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { stopPropagation } from "../../../../../common/dom/stop_propagation";
import { fireEvent } from "../../../../../common/dom/fire_event";
import "../../../../../components/ha-alert";
import "../../../../../components/ha-button";
import "../../../../../components/ha-dialog-footer";
import "../../../../../components/ha-dropdown";
import type { HaDropdownSelectEvent } from "../../../../../components/ha-dropdown";
import "../../../../../components/ha-dropdown-item";
import "../../../../../components/ha-icon-button";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-spinner";
import "../../../../../components/ha-svg-icon";
import "../../../../../components/ha-dialog";
import type {
  ZwaveCredentialCapabilities,
  ZwaveUser,
} from "../../../../../data/zwave_js-credentials";
import {
  ENTERABLE_ZWAVE_CREDENTIAL_TYPES,
  deleteZwaveAllUsers,
  deleteZwaveUser,
  getZwaveCredentialCapabilities,
  getZwaveUsers,
} from "../../../../../data/zwave_js-credentials";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../../../../../dialogs/generic/show-dialog-box";
import { haStyleDialog } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";
import type { ZwaveCredentialManageDialogParams } from "./show-dialog-zwave_js-credential-manage";
import { showZwaveCredentialUserEditDialog } from "./show-dialog-zwave_js-credential-user-edit";

@customElement("dialog-zwave_js-credential-manage")
class DialogZwaveCredentialManage extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _entityId?: string;

  @state() private _capabilities?: ZwaveCredentialCapabilities;

  @state() private _users: ZwaveUser[] = [];

  @state() private _loading = true;

  @state() private _busy = false;

  @state() private _open = false;

  public async showDialog(
    params: ZwaveCredentialManageDialogParams
  ): Promise<void> {
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
      this._capabilities = await getZwaveCredentialCapabilities(
        this.hass,
        this._entityId
      );

      if (this._capabilities.supports_user_management) {
        const usersResponse = await getZwaveUsers(this.hass, this._entityId);
        this._users = usersResponse.users;
      }
    } catch (err: unknown) {
      this.closeDialog();
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.zwave_js.credentials.errors.load_failed"
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

    const activeUsers = this._users.filter((u) => u.active);
    const showFooter =
      !this._loading &&
      this._capabilities?.supports_user_management &&
      this._supportsEnterableCredential;
    const showOverflowMenu =
      !this._loading &&
      this._capabilities?.supports_user_management &&
      activeUsers.length > 0;

    return html`
      <ha-dialog
        .hass=${this.hass}
        .open=${this._open}
        header-title=${this.hass.localize(
          "ui.panel.config.zwave_js.credentials.dialog_title"
        )}
        @closed=${this._dialogClosed}
      >
        ${showOverflowMenu
          ? html`<ha-dropdown
              slot="headerActionItems"
              @closed=${stopPropagation}
              @wa-select=${this._handleMenuAction}
              placement="bottom-end"
            >
              <ha-icon-button
                slot="trigger"
                .label=${this.hass.localize("ui.common.menu")}
                .path=${mdiDotsVertical}
                ?disabled=${this._busy}
              ></ha-icon-button>
              <ha-dropdown-item value="delete_all" variant="danger">
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.credentials.users.delete_all"
                )}
              </ha-dropdown-item>
            </ha-dropdown>`
          : nothing}
        ${this._loading
          ? html`<div class="center">
              <ha-spinner></ha-spinner>
            </div>`
          : this._capabilities && !this._capabilities.supports_user_management
            ? html`<div class="content">
                <ha-alert alert-type="warning">
                  ${this.hass.localize(
                    "ui.panel.config.zwave_js.credentials.errors.no_user_management"
                  )}
                </ha-alert>
              </div>`
            : html`<div class="content">
                ${this._renderUsers(activeUsers)}
              </div>`}
        ${showFooter
          ? html`<ha-dialog-footer slot="footer">
              <ha-button
                slot="primaryAction"
                @click=${this._addUser}
                ?disabled=${this._busy}
              >
                <ha-svg-icon slot="start" .path=${mdiPlus}></ha-svg-icon>
                ${this.hass.localize(
                  "ui.panel.config.zwave_js.credentials.users.add"
                )}
              </ha-button>
            </ha-dialog-footer>`
          : nothing}
      </ha-dialog>
    `;
  }

  private _handleMenuAction(ev: HaDropdownSelectEvent): void {
    if (ev.detail.item.value === "delete_all") {
      this._deleteAllUsers();
    }
  }

  private get _supportsEnterableCredential(): boolean {
    if (!this._capabilities?.supported_credential_types) {
      return false;
    }
    return ENTERABLE_ZWAVE_CREDENTIAL_TYPES.some(
      (type) => type in this._capabilities!.supported_credential_types
    );
  }

  private _renderUsers(activeUsers: ZwaveUser[]) {
    const hasNoCredentialTypes =
      !this._capabilities?.supported_credential_types ||
      Object.keys(this._capabilities.supported_credential_types).length === 0;

    return html`
      <div class="users-content">
        ${hasNoCredentialTypes
          ? html`<ha-alert alert-type="warning">
              ${this.hass.localize(
                "ui.panel.config.zwave_js.credentials.errors.no_credential_types_supported"
              )}
            </ha-alert>`
          : nothing}
        ${activeUsers.length === 0
          ? html`<p class="empty">
              ${this.hass.localize(
                "ui.panel.config.zwave_js.credentials.users.no_users"
              )}
            </p>`
          : html`
              <ha-md-list>
                ${activeUsers.map(
                  (user) => html`
                    <ha-md-list-item
                      type="button"
                      data-user-id=${user.user_id}
                      @click=${this._handleUserClick}
                    >
                      <div slot="start" class="icon-background">
                        <ha-svg-icon .path=${mdiAccountKey}></ha-svg-icon>
                      </div>
                      <div slot="headline">
                        ${user.user_name ||
                        this.hass.localize(
                          "ui.panel.config.zwave_js.credentials.users.unnamed_user",
                          { index: user.user_id }
                        )}
                      </div>
                      <div slot="supporting-text">
                        <span>
                          ${this.hass.localize(
                            `ui.panel.config.zwave_js.credentials.users.user_types.${user.user_type}.label` as any
                          ) || user.user_type}
                        </span>
                        <span class="credential-count">
                          ${this.hass.localize(
                            "ui.panel.config.zwave_js.credentials.users.credential_count",
                            { count: user.credentials.length }
                          )}
                        </span>
                      </div>
                      <ha-icon-button
                        slot="end"
                        .path=${mdiDelete}
                        .label=${this.hass.localize(
                          "ui.panel.config.zwave_js.credentials.users.delete"
                        )}
                        data-user-id=${user.user_id}
                        ?disabled=${this._busy}
                        @click=${this._handleDeleteUserClick}
                      ></ha-icon-button>
                    </ha-md-list-item>
                  `
                )}
              </ha-md-list>
            `}
      </div>
    `;
  }

  private _userFromEvent(ev: Event): ZwaveUser | undefined {
    const idx = Number((ev.currentTarget as HTMLElement).dataset.userId ?? "");
    return this._users.find((u) => u.user_id === idx);
  }

  private _handleUserClick(ev: Event): void {
    if (this._busy) {
      return;
    }
    const user = this._userFromEvent(ev);
    if (user) {
      this._editUser(user);
    }
  }

  private _handleDeleteUserClick(ev: Event): void {
    ev.preventDefault();
    ev.stopPropagation();
    const user = this._userFromEvent(ev);
    if (user) {
      this._deleteUser(user);
    }
  }

  private _addUser(): void {
    showZwaveCredentialUserEditDialog(this, {
      entity_id: this._entityId!,
      capabilities: this._capabilities!,
      onSaved: () => this._fetchData(),
    });
  }

  private _editUser(user: ZwaveUser): void {
    showZwaveCredentialUserEditDialog(this, {
      entity_id: this._entityId!,
      capabilities: this._capabilities!,
      user,
      onSaved: () => this._fetchData(),
    });
  }

  private async _deleteUser(user: ZwaveUser): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.zwave_js.credentials.users.delete"
      ),
      text: this.hass.localize(
        "ui.panel.config.zwave_js.credentials.confirm_delete_user",
        {
          name:
            user.user_name ||
            this.hass.localize(
              "ui.panel.config.zwave_js.credentials.users.unnamed_user",
              { index: user.user_id }
            ),
        }
      ),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    this._busy = true;
    try {
      await deleteZwaveUser(this.hass, this._entityId!, user.user_id);
    } catch (err: unknown) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.zwave_js.credentials.errors.save_failed"
        ),
        text: (err as Error).message,
      });
    }
    try {
      await this._fetchData();
    } finally {
      this._busy = false;
    }
  }

  private async _deleteAllUsers(): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.panel.config.zwave_js.credentials.users.delete_all"
      ),
      text: this.hass.localize(
        "ui.panel.config.zwave_js.credentials.confirm_delete_all_users"
      ),
      confirmText: this.hass.localize("ui.common.delete"),
      destructive: true,
    });
    if (!confirmed) {
      return;
    }
    this._busy = true;
    try {
      await deleteZwaveAllUsers(this.hass, this._entityId!);
    } catch (err: unknown) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.panel.config.zwave_js.credentials.errors.save_failed"
        ),
        text: (err as Error).message,
      });
    }
    try {
      await this._fetchData();
    } finally {
      this._busy = false;
    }
  }

  public closeDialog(): void {
    this._open = false;
  }

  private _dialogClosed(): void {
    this._entityId = undefined;
    this._capabilities = undefined;
    this._users = [];
    this._loading = true;
    this._busy = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  static get styles(): CSSResultGroup {
    return [
      haStyleDialog,
      css`
        ha-dialog {
          --dialog-content-padding: 0;
        }
        .center {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--ha-space-6);
        }
        .content > ha-alert {
          margin: var(--ha-space-4);
        }
        .empty {
          text-align: center;
          color: var(--secondary-text-color);
          padding: var(--ha-space-6);
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
        .credential-count {
          margin-inline-start: var(--ha-space-2);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-zwave_js-credential-manage": DialogZwaveCredentialManage;
  }
}
