import "@material/mwc-list/mwc-list";
import {
  mdiAutoFix,
  mdiLifebuoy,
  mdiPower,
  mdiPowerCycle,
  mdiRefresh,
} from "@mdi/js";
import { CSSResultGroup, LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import { shouldHandleRequestSelectedEvent } from "../../common/mwc/handle-request-selected-event";
import "../../components/ha-circular-progress";
import { createCloseHeading } from "../../components/ha-dialog";
import "../../components/ha-expansion-panel";
import "../../components/ha-list-item";
import {
  extractApiErrorMessage,
  ignoreSupervisorError,
} from "../../data/hassio/common";
import {
  HassioHostInfo,
  fetchHassioHostInfo,
  rebootHost,
  shutdownHost,
} from "../../data/hassio/host";
import { haStyle, haStyleDialog } from "../../resources/styles";
import { HomeAssistant } from "../../types";
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

  public closeDialog(): void {
    this._open = false;
    this._loadingHostInfo = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._open) {
      return nothing;
    }

    const showReload = this.hass.userData?.showAdvanced;
    const showRebootShutdown = !!this._hostInfo;

    return html`
      <ha-dialog
        open
        @closed=${this.closeDialog}
        hideActions
        .heading=${!this._loadingHostInfo
          ? createCloseHeading(
              this.hass,
              this.hass.localize("ui.dialogs.restart.heading")
            )
          : undefined}
      >
        ${this._loadingHostInfo
          ? html`
              <div class="loader">
                <ha-circular-progress active></ha-circular-progress>
              </div>
            `
          : html`
              <mwc-list dialogInitialFocus>
                ${showReload
                  ? html`
                      <ha-list-item
                        graphic="avatar"
                        twoline
                        multiline-secondary
                        @request-selected=${this._reload}
                      >
                        <div slot="graphic" class="icon-background reload">
                          <ha-svg-icon .path=${mdiAutoFix}></ha-svg-icon>
                        </div>
                        <span>
                          ${this.hass.localize(
                            "ui.dialogs.restart.reload.title"
                          )}
                        </span>
                        <span slot="secondary">
                          ${this.hass.localize(
                            "ui.dialogs.restart.reload.description"
                          )}
                        </span>
                      </ha-list-item>
                    `
                  : nothing}
                <ha-list-item
                  graphic="avatar"
                  twoline
                  multiline-secondary
                  @request-selected=${this._restart}
                >
                  <div slot="graphic" class="icon-background restart">
                    <ha-svg-icon .path=${mdiRefresh}></ha-svg-icon>
                  </div>
                  <span>
                    ${this.hass.localize("ui.dialogs.restart.restart.title")}
                  </span>
                  <span slot="secondary">
                    ${this.hass.localize(
                      "ui.dialogs.restart.restart.description"
                    )}
                  </span>
                </ha-list-item>
              </mwc-list>
              <ha-expansion-panel
                .header=${this.hass.localize(
                  "ui.dialogs.restart.advanced_options"
                )}
              >
                <mwc-list>
                  ${showRebootShutdown
                    ? html`
                        <ha-list-item
                          graphic="avatar"
                          twoline
                          multiline-secondary
                          hasMeta
                          @request-selected=${this._hostReboot}
                        >
                          <div slot="graphic" class="icon-background reboot">
                            <ha-svg-icon .path=${mdiPowerCycle}></ha-svg-icon>
                          </div>
                          <span>
                            ${this.hass.localize(
                              "ui.dialogs.restart.reboot.title"
                            )}
                          </span>
                          <span slot="secondary">
                            ${this.hass.localize(
                              "ui.dialogs.restart.reboot.description"
                            )}
                          </span>
                        </ha-list-item>
                        <ha-list-item
                          graphic="avatar"
                          twoline
                          multiline-secondary
                          hasMeta
                          @request-selected=${this._hostShutdown}
                        >
                          <div slot="graphic" class="icon-background shutdown">
                            <ha-svg-icon .path=${mdiPower}></ha-svg-icon>
                          </div>
                          <span>
                            ${this.hass.localize(
                              "ui.dialogs.restart.shutdown.title"
                            )}
                          </span>
                          <span slot="secondary">
                            ${this.hass.localize(
                              "ui.dialogs.restart.shutdown.description"
                            )}
                          </span>
                        </ha-list-item>
                      `
                    : nothing}
                  <ha-list-item
                    graphic="avatar"
                    twoline
                    multiline-secondary
                    hasMeta
                    @request-selected=${this._restartSafeMode}
                  >
                    <div
                      slot="graphic"
                      class="icon-background restart-safe-mode"
                    >
                      <ha-svg-icon .path=${mdiLifebuoy}></ha-svg-icon>
                    </div>
                    <span>
                      ${this.hass.localize(
                        "ui.dialogs.restart.restart-safe-mode.title"
                      )}
                    </span>
                    <span slot="secondary">
                      ${this.hass.localize(
                        "ui.dialogs.restart.restart-safe-mode.description"
                      )}
                    </span>
                  </ha-list-item>
                </mwc-list>
              </ha-expansion-panel>
            `}
      </ha-dialog>
    `;
  }

  private async _reload(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }

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

  private async _restart(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this._showRestartDialog();
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

  private async _restartSafeMode(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    this._showRestartSafeModeDialog();
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

  private async _hostReboot(ev): Promise<void> {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
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
      duration: 0,
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

  private async _hostShutdown(ev): Promise<void> {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
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
      duration: 0,
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
        ha-dialog {
          --dialog-content-padding: 0;
        }
        @media all and (min-width: 550px) {
          ha-dialog {
            --mdc-dialog-min-width: 500px;
            --mdc-dialog-max-width: 500px;
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
