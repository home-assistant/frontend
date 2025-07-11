import "@material/mwc-linear-progress/mwc-linear-progress";
import {
  mdiAutoFix,
  mdiClose,
  mdiLifebuoy,
  mdiPower,
  mdiPowerCycle,
  mdiRefresh,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-alert";
import "../../components/ha-expansion-panel";
import "../../components/ha-fade-in";
import "../../components/ha-icon-button";
import "../../components/ha-icon-next";
import "../../components/ha-md-dialog";
import type { HaMdDialog } from "../../components/ha-md-dialog";
import "../../components/ha-md-list";
import "../../components/ha-md-list-item";
import "../../components/ha-spinner";
import { fetchBackupInfo } from "../../data/backup";
import type { BackupManagerState } from "../../data/backup_manager";
import {
  extractApiErrorMessage,
  ignoreSupervisorError,
} from "../../data/hassio/common";
import type { HassioHostInfo } from "../../data/hassio/host";
import {
  fetchHassioHostInfo,
  rebootHost,
  shutdownHost,
} from "../../data/hassio/host";
import { haStyle, haStyleDialog } from "../../resources/styles";
import type { HomeAssistant, ServiceCallRequest } from "../../types";
import { showToast } from "../../util/toast";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../generic/show-dialog-box";
import { showRestartWaitDialog } from "./show-dialog-restart";

@customElement("dialog-restart")
class DialogRestart extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state()
  private _loadingHostInfo = false;

  @state()
  private _loadingBackupInfo = false;

  @state()
  private _hostInfo?: HassioHostInfo;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public async showDialog(): Promise<void> {
    const isHassioLoaded = isComponentLoaded(this.hass, "hassio");

    this._open = true;

    if (isHassioLoaded && !this._hostInfo) {
      this._loadHostInfo();
    }
  }

  private async _loadBackupState() {
    try {
      const { state: backupState } = await fetchBackupInfo(this.hass);
      return backupState;
    } catch (_err) {
      // Do nothing
      return "idle";
    }
  }

  private async _loadHostInfo() {
    this._loadingHostInfo = true;
    try {
      this._hostInfo = await fetchHassioHostInfo(this.hass);
    } catch (_err) {
      // Do nothing
    } finally {
      this._loadingHostInfo = false;
    }
  }

  private _dialogClosed(): void {
    this._open = false;
    this._loadingHostInfo = false;
    this._loadingBackupInfo = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public closeDialog(): void {
    this._dialog?.close();
  }

  protected render() {
    if (!this._open) {
      return nothing;
    }

    const showReload = this.hass.userData?.showAdvanced;
    const showRebootShutdown = !!this._hostInfo;

    const dialogTitle = this.hass.localize("ui.dialogs.restart.heading");

    return html`
      <ha-md-dialog open @closed=${this._dialogClosed}>
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.common.close") ?? "Close"}
            .path=${mdiClose}
            @click=${this.closeDialog}
          ></ha-icon-button>
          <span slot="title" .title=${dialogTitle}> ${dialogTitle} </span>
        </ha-dialog-header>
        <div slot="content" class="content">
          <div class="action-loader">
            ${this._loadingBackupInfo
              ? html`<ha-fade-in .delay=${250}>
                  <mwc-linear-progress
                    .indeterminate=${true}
                  ></mwc-linear-progress>
                </ha-fade-in>`
              : nothing}
          </div>
          ${this._loadingHostInfo
            ? html`
                <div class="loader">
                  <ha-spinner></ha-spinner>
                </div>
              `
            : html`
                <ha-md-list dialogInitialFocus>
                  ${showReload
                    ? html`
                        <ha-md-list-item
                          type="button"
                          @click=${this._reload}
                          .disabled=${this._loadingBackupInfo}
                        >
                          <div slot="headline">
                            ${this.hass.localize(
                              "ui.dialogs.restart.reload.title"
                            )}
                          </div>
                          <div slot="supporting-text">
                            ${this.hass.localize(
                              "ui.dialogs.restart.reload.description"
                            )}
                          </div>
                          <div slot="start" class="icon-background reload">
                            <ha-svg-icon .path=${mdiAutoFix}></ha-svg-icon>
                          </div>
                          <ha-icon-next slot="end"></ha-icon-next>
                        </ha-md-list-item>
                      `
                    : nothing}
                  <ha-md-list-item
                    type="button"
                    .action=${"restart"}
                    @click=${this._handleAction}
                    .disabled=${this._loadingBackupInfo}
                  >
                    <div slot="start" class="icon-background restart">
                      <ha-svg-icon .path=${mdiRefresh}></ha-svg-icon>
                    </div>
                    <div slot="headline">
                      ${this.hass.localize("ui.dialogs.restart.restart.title")}
                    </div>
                    <div slot="supporting-text">
                      ${this.hass.localize(
                        "ui.dialogs.restart.restart.description"
                      )}
                    </div>
                    <ha-icon-next slot="end"></ha-icon-next>
                  </ha-md-list-item>
                </ha-md-list>
                <ha-expansion-panel
                  .header=${this.hass.localize(
                    "ui.dialogs.restart.advanced_options"
                  )}
                >
                  <ha-md-list>
                    ${showRebootShutdown
                      ? html`
                          <ha-md-list-item
                            type="button"
                            .action=${"reboot"}
                            @click=${this._handleAction}
                            .disabled=${this._loadingBackupInfo}
                          >
                            <div slot="start" class="icon-background reboot">
                              <ha-svg-icon .path=${mdiPowerCycle}></ha-svg-icon>
                            </div>
                            <div slot="headline">
                              ${this.hass.localize(
                                "ui.dialogs.restart.reboot.title"
                              )}
                            </div>
                            <div slot="supporting-text">
                              ${this.hass.localize(
                                "ui.dialogs.restart.reboot.description"
                              )}
                            </div>
                            <ha-icon-next slot="end"></ha-icon-next>
                          </ha-md-list-item>
                          <ha-md-list-item
                            type="button"
                            .action=${"shutdown"}
                            @click=${this._handleAction}
                            .disabled=${this._loadingBackupInfo}
                          >
                            <div slot="start" class="icon-background shutdown">
                              <ha-svg-icon .path=${mdiPower}></ha-svg-icon>
                            </div>
                            <div slot="headline">
                              ${this.hass.localize(
                                "ui.dialogs.restart.shutdown.title"
                              )}
                            </div>
                            <div slot="supporting-text">
                              ${this.hass.localize(
                                "ui.dialogs.restart.shutdown.description"
                              )}
                            </div>
                            <ha-icon-next slot="end"></ha-icon-next>
                          </ha-md-list-item>
                        `
                      : nothing}
                    <ha-md-list-item
                      type="button"
                      .action=${"restart-safe-mode"}
                      @click=${this._handleAction}
                      .disabled=${this._loadingBackupInfo}
                    >
                      <div
                        slot="start"
                        class="icon-background restart-safe-mode"
                      >
                        <ha-svg-icon .path=${mdiLifebuoy}></ha-svg-icon>
                      </div>
                      <div slot="headline">
                        ${this.hass.localize(
                          "ui.dialogs.restart.restart-safe-mode.title"
                        )}
                      </div>
                      <div slot="supporting-text">
                        ${this.hass.localize(
                          "ui.dialogs.restart.restart-safe-mode.description"
                        )}
                      </div>
                      <ha-icon-next slot="end"></ha-icon-next>
                    </ha-md-list-item>
                  </ha-md-list>
                </ha-expansion-panel>
              `}
        </div>
      </ha-md-dialog>
    `;
  }

  private async _reload() {
    this.closeDialog();

    showToast(this, {
      message: this.hass.localize("ui.dialogs.restart.reload.reloading"),
      duration: 1000,
    });

    this._restartAction(
      "homeassistant",
      "reload_all",
      this.hass.localize("ui.dialogs.restart.reload.failed")
    )();
  }

  private _getBackupProgressMessage(backupState: BackupManagerState) {
    switch (backupState) {
      case "create_backup":
        return this.hass.localize("ui.dialogs.restart.backup_in_progress");
      case "receive_backup":
        return this.hass.localize("ui.dialogs.restart.upload_in_progress");
      case "restore_backup":
        return this.hass.localize("ui.dialogs.restart.restore_in_progress");
      default:
        return "";
    }
  }

  private _restartAction =
    (
      domain: ServiceCallRequest["domain"],
      service: ServiceCallRequest["service"],
      errorTitle: string,

      serviceData?: ServiceCallRequest["serviceData"]
    ) =>
    async () => {
      try {
        await this.hass.callService(domain, service, serviceData);
      } catch (err: any) {
        showAlertDialog(this, {
          title: errorTitle,
          text: err.message,
        });
      }
    };

  private _hostAction =
    (toastMessage: string, action: "reboot" | "shutdown") => async () => {
      showToast(this, {
        message: toastMessage,
        duration: -1,
      });

      try {
        if (action === "reboot") {
          await rebootHost(this.hass);
        } else {
          await shutdownHost(this.hass);
        }
      } catch (err: any) {
        // Ignore connection errors, these are all expected
        if (this.hass.connection.connected && !ignoreSupervisorError(err)) {
          showAlertDialog(this, {
            title: this.hass.localize(`ui.dialogs.restart.${action}.failed`),
            text: extractApiErrorMessage(err),
          });
        }
      }
    };

  private async _handleAction(ev) {
    if (this._loadingBackupInfo) {
      return;
    }
    this._loadingBackupInfo = true;
    const action = ev.currentTarget.action as
      | "restart"
      | "reboot"
      | "shutdown"
      | "restart-safe-mode";

    const backupState = await this._loadBackupState();

    const backupProgressMessage = this._getBackupProgressMessage(backupState);

    this._loadingBackupInfo = false;

    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(`ui.dialogs.restart.${action}.confirm_title`),
      text: html`${this.hass.localize(
        `ui.dialogs.restart.${action}.confirm_description`
      )}${backupProgressMessage
        ? html`<br /><br /><ha-alert>${backupProgressMessage}</ha-alert>`
        : nothing}`,
      confirmText: this.hass.localize(
        `ui.dialogs.restart.${action}.confirm_action${backupState === "idle" ? "" : "_backup"}`
      ),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    this.closeDialog();

    let actionFunc;

    if (["restart", "restart-safe-mode"].includes(action)) {
      const serviceData =
        action === "restart-safe-mode" ? { safe_mode: true } : undefined;
      actionFunc = this._restartAction(
        "homeassistant",
        "restart",
        this.hass.localize(`ui.dialogs.restart.${action}.failed`),
        serviceData
      );
    } else {
      actionFunc = this._hostAction(
        this.hass.localize(
          `ui.dialogs.restart.${action as "reboot" | "shutdown"}.action_toast`
        ),
        action as "reboot" | "shutdown"
      );
    }

    if (backupState !== "idle") {
      showRestartWaitDialog(this, {
        title: this.hass.localize(`ui.dialogs.restart.${action}.title`),
        initialBackupState: backupState,
        action: actionFunc,
      });
      return;
    }

    actionFunc();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-md-dialog {
          --dialog-content-padding: 0;
        }
        @media all and (min-width: 550px) {
          ha-md-dialog {
            min-width: 500px;
            max-width: 500px;
          }
        }

        ha-expansion-panel {
          border-top: 1px solid var(--divider-color);
          margin-bottom: 10px;
          box-shadow: none;
          --expansion-panel-content-padding: 0;
          --expansion-panel-summary-padding: 0
            var(--mdc-list-side-padding, 20px);
          --ha-card-border-radius: 0;
        }

        .icon-background {
          border-radius: 50%;
          color: #fff;
          display: flex;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .reload {
          background-color: #5f8a49;
        }
        .restart {
          background-color: #ffd500;
          color: #665500;
        }
        .reboot {
          background-color: #ba1b1b;
          color: #fff;
        }
        .shutdown {
          background-color: #0b1d29;
          color: #fff;
        }
        .restart-safe-mode {
          background-color: #e48629;
          color: #fff;
        }
        .divider {
          height: 1px;
          background-color: var(--divider-color);
        }
        .section {
          font-size: var(--ha-font-size-m);
          font-weight: var(--ha-font-weight-medium);
          line-height: var(--ha-line-height-condensed);
          margin: 8px 0 4px 0;
          padding-left: var(--mdc-list-side-padding, 20px);
          padding-right: var(--mdc-list-side-padding, 20px);
          padding-inline-start: var(--mdc-list-side-padding, 20px);
          padding-inline-end: var(--mdc-list-side-padding, 20px);
        }
        .loader {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .action-loader {
          height: 4px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-restart": DialogRestart;
  }
}
