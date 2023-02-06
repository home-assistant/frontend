import "@material/mwc-list/mwc-list";
import { mdiAutoFix, mdiPower, mdiPowerCycle, mdiRefresh } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators";
import { componentsWithService } from "../../common/config/components_with_service";
import { isComponentLoaded } from "../../common/config/is_component_loaded";
import { fireEvent } from "../../common/dom/fire_event";
import { shouldHandleRequestSelectedEvent } from "../../common/mwc/handle-request-selected-event";
import { createCloseHeading } from "../../components/ha-dialog";
import "../../components/ha-list-item";
import {
  extractApiErrorMessage,
  ignoreSupervisorError,
} from "../../data/hassio/common";
import {
  fetchHassioHostInfo,
  HassioHostInfo,
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
import "../../components/ha-circular-progress";

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

    // Present restart core dialog if no host actions and not advanced mode as it's the only option
    if (!this.hass.userData?.showAdvanced && !this._hostInfo) {
      this._open = false;
      this._showRestartDialog().then(() => this.closeDialog());
      return;
    }

    await this.updateComplete;
  }

  public closeDialog(): void {
    this._open = false;
    this._loadingHostInfo = false;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render(): TemplateResult {
    if (!this._open) {
      return html``;
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
                        hasMeta
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
                  : null}
                <ha-list-item
                  graphic="avatar"
                  twoline
                  hasMeta
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
                ${showRebootShutdown
                  ? html`
                      <div class="divider"></div>
                      <ha-list-item
                        graphic="avatar"
                        twoline
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
                            "ui.dialogs.restart.shutdown.confirm_action"
                          )}
                        </span>
                      </ha-list-item>
                    `
                  : null}
              </mwc-list>
            `}
      </ha-dialog>
    `;
  }

  private async _reload(ev) {
    if (!shouldHandleRequestSelectedEvent(ev)) {
      return;
    }
    const reloadableDomains = componentsWithService(this.hass, "reload");

    this.closeDialog();

    showToast(this, {
      message: this.hass.localize("ui.dialogs.restart.reload.reloading"),
      duration: 2000,
    });

    for (const domain of reloadableDomains) {
      // eslint-disable-next-line no-await-in-loop
      await this.hass.callService(domain, "reload");
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
        .icon-background {
          border-radius: 50%;
          color: #fff;
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
        .divider {
          height: 1px;
          background-color: var(--divider-color);
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
