import {
  mdiAutoFix,
  mdiLifebuoy,
  mdiPower,
  mdiPowerCycle,
  mdiRefresh,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import type { HASSDomCurrentTargetEvent } from "../../common/dom/fire_event";
import "../../components/animation/ha-fade-in";
import "../../components/ha-adaptive-dialog";
import "../../components/ha-expansion-panel";
import "../../components/ha-icon-next";
import "../../components/ha-spinner";
import "../../components/item/ha-list-item-button";
import type { HaListItemButton } from "../../components/item/ha-list-item-button";
import "../../components/list/ha-list-base";
import "../../components/progress/ha-progress-bar";
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
import type { HomeAssistant } from "../../types";
import { HOST_ACTION_TOAST_ID, showToast } from "../../util/toast";
import { showAlertDialog } from "../generic/show-dialog-box";
import {
  confirmRestartAction,
  showRestartConfirmation,
  type RestartAction,
} from "./show-restart-confirmation";

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

  @state()
  private _dialogOpen = false;

  public async showDialog(): Promise<void> {
    const isHassioLoaded = isComponentLoaded(this.hass.config, "hassio");

    this._open = true;
    this._dialogOpen = true;

    if (isHassioLoaded && !this._hostInfo) {
      this._loadHostInfo();
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
    this._dialogOpen = false;
    this._open = false;
    this._loadingHostInfo = false;
    this._loadingBackupInfo = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._open) {
      return nothing;
    }

    const showRebootShutdown = !!this._hostInfo;

    const dialogTitle = this.hass.localize("ui.dialogs.restart.heading");

    return html`
      <ha-adaptive-dialog
        .open=${this._dialogOpen}
        header-title=${dialogTitle}
        allow-mode-change
        flexcontent
        @closed=${this._dialogClosed}
      >
        <div class="content">
          <div class="action-loader">
            ${
              this._loadingBackupInfo
                ? html`<ha-fade-in .delay=${250}>
                    <ha-progress-bar indeterminate></ha-progress-bar>
                  </ha-fade-in>`
                : nothing
            }
          </div>
          ${
            this._loadingHostInfo
              ? html`
                  <div class="loader">
                    <ha-spinner></ha-spinner>
                  </div>
                `
              : html`
                  <ha-list-base dialogInitialFocus>
                    <ha-list-item-button
                      @click=${this._reload}
                      .disabled=${this._loadingBackupInfo}
                    >
                      <div slot="headline">
                        ${this.hass.localize("ui.dialogs.restart.reload.title")}
                      </div>
                      <div slot="supporting-text">
                        ${this.hass.localize(
                          "ui.dialogs.restart.reload.description"
                        )}
                      </div>
                      <ha-svg-icon
                        slot="start"
                        class="icon-background reload"
                        .path=${mdiAutoFix}
                      ></ha-svg-icon>
                      <ha-icon-next slot="end"></ha-icon-next>
                    </ha-list-item-button>
                    <ha-list-item-button
                      .action=${"restart"}
                      @click=${this._handleAction}
                      .disabled=${this._loadingBackupInfo}
                    >
                      <ha-svg-icon
                        slot="start"
                        class="icon-background restart"
                        .path=${mdiRefresh}
                      ></ha-svg-icon>
                      <div slot="headline">
                        ${this.hass.localize("ui.dialogs.restart.restart.title")}
                      </div>
                      <div slot="supporting-text">
                        ${this.hass.localize(
                          "ui.dialogs.restart.restart.description"
                        )}
                      </div>
                      <ha-icon-next slot="end"></ha-icon-next>
                    </ha-list-item-button>
                  </ha-list-base>
                  <ha-expansion-panel
                    .header=${this.hass.localize(
                      "ui.dialogs.restart.more_options"
                    )}
                  >
                    <ha-list-base>
                      ${
                        showRebootShutdown
                          ? html`
                              <ha-list-item-button
                                .action=${"reboot"}
                                @click=${this._handleAction}
                                .disabled=${this._loadingBackupInfo}
                              >
                                <ha-svg-icon
                                  slot="start"
                                  class="icon-background reboot"
                                  .path=${mdiPowerCycle}
                                ></ha-svg-icon>
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
                              </ha-list-item-button>
                              <ha-list-item-button
                                .action=${"shutdown"}
                                @click=${this._handleAction}
                                .disabled=${this._loadingBackupInfo}
                              >
                                <ha-svg-icon
                                  slot="start"
                                  class="icon-background shutdown"
                                  .path=${mdiPower}
                                ></ha-svg-icon>
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
                              </ha-list-item-button>
                            `
                          : nothing
                      }
                      <ha-list-item-button
                        .action=${"restart-safe-mode"}
                        @click=${this._handleAction}
                        .disabled=${this._loadingBackupInfo}
                      >
                        <ha-svg-icon
                          slot="start"
                          class="icon-background restart-safe-mode"
                          .path=${mdiLifebuoy}
                        ></ha-svg-icon>
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
                      </ha-list-item-button>
                    </ha-list-base>
                  </ha-expansion-panel>
                `
          }
        </div>
      </ha-adaptive-dialog>
    `;
  }

  private async _reload() {
    this._dialogOpen = false;

    showToast(this, {
      message: this.hass.localize("ui.dialogs.restart.reload.reloading"),
      duration: 1000,
    });

    try {
      await this.hass.callService("homeassistant", "reload_all");
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.dialogs.restart.reload.failed"),
        text: err.message,
      });
    }
  }

  private _hostAction =
    (toastMessage: string, action: "reboot" | "shutdown") => async () => {
      showToast(this, {
        id: HOST_ACTION_TOAST_ID,
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
          showToast(this, {
            id: HOST_ACTION_TOAST_ID,
            message: "",
            duration: 0,
          });
          showAlertDialog(this, {
            title: this.hass.localize(`ui.dialogs.restart.${action}.failed`),
            text: extractApiErrorMessage(err),
          });
        }
      }
    };

  private async _handleAction(
    ev: HASSDomCurrentTargetEvent<HaListItemButton & { action: RestartAction }>
  ) {
    if (this._loadingBackupInfo) {
      return;
    }
    this._loadingBackupInfo = true;
    const action = ev.currentTarget.action;
    try {
      const confirmed =
        action === "restart" || action === "restart-safe-mode"
          ? await showRestartConfirmation(this, this.hass, action)
          : await confirmRestartAction(
              this,
              this.hass,
              action,
              this._hostAction(
                this.hass.localize(`ui.dialogs.restart.${action}.action_toast`),
                action
              )
            );
      if (confirmed) {
        this._dialogOpen = false;
      }
    } finally {
      this._loadingBackupInfo = false;
    }
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-adaptive-dialog {
          --dialog-content-padding: 0;
        }

        ha-expansion-panel {
          border-top: 1px solid var(--divider-color);
          margin-bottom: 10px;
          box-shadow: none;
          --expansion-panel-content-padding: 0;
          --expansion-panel-summary-padding: 0 var(--ha-space-5);
          --ha-card-border-radius: var(--ha-border-radius-square);
        }

        .icon-background {
          border-radius: var(--ha-border-radius-circle);
          color: #fff;
          /* 24px icon + padding = 40px circle */
          padding: var(--ha-space-2);
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
          padding-inline: var(--ha-space-5);
        }
        .loader {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .action-loader {
          --ha-progress-bar-track-height: 4px;
          --ha-progress-bar-border-radius: 0;
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
