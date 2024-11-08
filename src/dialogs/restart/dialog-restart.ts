import {
  mdiAutoFix,
  mdiLifebuoy,
  mdiPower,
  mdiPowerCycle,
  mdiRefresh,
  mdiClose,
} from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state, query } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import "../../components/ha-circular-progress";
import "../../components/ha-md-dialog";
import type { HaMdDialog } from "../../components/ha-md-dialog";
import "../../components/ha-md-list";
import "../../components/ha-expansion-panel";
import "../../components/ha-md-list-item";
import "../../components/ha-icon-button";
import "../../components/ha-icon-next";
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
import { showToast } from "../../util/toast";
import {
  showAlertDialog,
  showConfirmationDialog,
} from "../generic/show-dialog-box";

@customElement("dialog-restart")
class DialogRestart extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _open = false;

  @state()
  private _loadingHostInfo = false;

  @state()
  private _hostInfo?: HassioHostInfo;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public async showDialog(): Promise<void> {
    const isHassioLoaded = isComponentLoaded(this.hass, "hassio");

    this._open = true;

    if (isHassioLoaded && !this._hostInfo) {
      this._loadingHostInfo = true;
      try {
        this._hostInfo = await fetchHassioHostInfo(this.hass);
      } catch (_err) {
        // Do nothing
      } finally {
        this._loadingHostInfo = false;
      }
    }
  }

  private _dialogClosed(): void {
    this._open = false;
    this._loadingHostInfo = false;
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
            .label=${this.hass.localize("ui.dialogs.generic.close") ?? "Close"}
            .path=${mdiClose}
            @click=${this.closeDialog}
          ></ha-icon-button>
          <span slot="title" .title=${dialogTitle}> ${dialogTitle} </span>
        </ha-dialog-header>
        <div slot="content" class="content">
          ${this._loadingHostInfo
            ? html`
                <div class="loader">
                  <ha-circular-progress indeterminate></ha-circular-progress>
                </div>
              `
            : html`
                <ha-md-list dialogInitialFocus>
                  ${showReload
                    ? html`
                        <ha-md-list-item type="button" @click=${this._reload}>
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
                    @click=${this._showRestartDialog}
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
                            @click=${this._hostReboot}
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
                            @click=${this._hostShutdown}
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
                      @click=${this._showRestartSafeModeDialog}
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

    try {
      await this.hass.callService("homeassistant", "reload_all");
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.dialogs.restart.reload.failed"),
        text: err.message,
      });
    }
  }

  private async _showRestartDialog() {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.dialogs.restart.restart.confirm_title"),
      text: this.hass.localize(
        "ui.dialogs.restart.restart.confirm_description"
      ),
      confirmText: this.hass.localize(
        "ui.dialogs.restart.restart.confirm_action"
      ),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    this.closeDialog();

    try {
      await this.hass.callService("homeassistant", "restart");
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize("ui.dialogs.restart.restart.failed"),
        text: err.message,
      });
    }
  }

  private async _showRestartSafeModeDialog() {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize(
        "ui.dialogs.restart.restart-safe-mode.confirm_title"
      ),
      text: this.hass.localize(
        "ui.dialogs.restart.restart-safe-mode.confirm_description"
      ),
      confirmText: this.hass.localize(
        "ui.dialogs.restart.restart-safe-mode.confirm_action"
      ),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    this.closeDialog();

    try {
      await this.hass.callService("homeassistant", "restart", {
        safe_mode: true,
      });
    } catch (err: any) {
      showAlertDialog(this, {
        title: this.hass.localize(
          "ui.dialogs.restart.restart-safe-mode.failed"
        ),
        text: err.message,
      });
    }
  }

  private async _hostReboot(): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.dialogs.restart.reboot.confirm_title"),
      text: this.hass.localize("ui.dialogs.restart.reboot.confirm_description"),
      confirmText: this.hass.localize(
        "ui.dialogs.restart.reboot.confirm_action"
      ),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    this.closeDialog();

    showToast(this, {
      message: this.hass.localize("ui.dialogs.restart.reboot.rebooting"),
      duration: -1,
    });

    try {
      await rebootHost(this.hass);
    } catch (err: any) {
      // Ignore connection errors, these are all expected
      if (this.hass.connection.connected && !ignoreSupervisorError(err)) {
        showAlertDialog(this, {
          title: this.hass.localize("ui.dialogs.restart.reboot.failed"),
          text: extractApiErrorMessage(err),
        });
      }
    }
  }

  private async _hostShutdown(): Promise<void> {
    const confirmed = await showConfirmationDialog(this, {
      title: this.hass.localize("ui.dialogs.restart.shutdown.confirm_title"),
      text: this.hass.localize(
        "ui.dialogs.restart.shutdown.confirm_description"
      ),
      confirmText: this.hass.localize(
        "ui.dialogs.restart.shutdown.confirm_action"
      ),
      destructive: true,
    });

    if (!confirmed) {
      return;
    }

    this.closeDialog();

    showToast(this, {
      message: this.hass.localize("ui.dialogs.restart.shutdown.shutting_down"),
      duration: -1,
    });

    try {
      await shutdownHost(this.hass);
    } catch (err: any) {
      // Ignore connection errors, these are all expected
      if (this.hass.connection.connected && !ignoreSupervisorError(err)) {
        showAlertDialog(this, {
          title: this.hass.localize("ui.dialogs.restart.shutdown.failed"),
          text: extractApiErrorMessage(err),
        });
      }
    }
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
          font-weight: 500;
          font-size: 14px;
          line-height: 20px;
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-restart": DialogRestart;
  }
}
