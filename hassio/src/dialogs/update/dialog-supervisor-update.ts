import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-alert";
import "../../../../src/components/ha-circular-progress";
import "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-settings-row";
import "../../../../src/components/ha-svg-icon";
import "../../../../src/components/ha-switch";
import {
  extractApiErrorMessage,
  ignoreSupervisorError,
} from "../../../../src/data/hassio/common";
import { createHassioPartialBackup } from "../../../../src/data/hassio/backup";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { SupervisorDialogSupervisorUpdateParams } from "./show-dialog-update";

@customElement("dialog-supervisor-update")
class DialogSupervisorUpdate extends LitElement {
  public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _createBackup = true;

  @state() private _action: "backup" | "update" | null = null;

  @state() private _error?: string;

  @state()
  private _dialogParams?: SupervisorDialogSupervisorUpdateParams;

  public async showDialog(
    params: SupervisorDialogSupervisorUpdateParams
  ): Promise<void> {
    this._opened = true;
    this._dialogParams = params;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._action = null;
    this._createBackup = true;
    this._error = undefined;
    this._dialogParams = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public focus(): void {
    this.updateComplete.then(() =>
      (
        this.shadowRoot?.querySelector("[dialogInitialFocus]") as HTMLElement
      )?.focus()
    );
  }

  protected render(): TemplateResult {
    if (!this._dialogParams) {
      return html``;
    }
    return html`
      <ha-dialog .open=${this._opened} scrimClickAction escapeKeyAction>
        ${this._action === null
          ? html`<slot name="heading">
                <h2 id="title" class="header_title">
                  ${this._dialogParams.supervisor.localize(
                    "confirm.update.title",
                    "name",
                    this._dialogParams.name
                  )}
                </h2>
              </slot>
              <div>
                ${this._dialogParams.supervisor.localize(
                  "confirm.update.text",
                  "name",
                  this._dialogParams.name,
                  "version",
                  this._dialogParams.version
                )}
              </div>

              <ha-settings-row>
                <span slot="heading">
                  ${this._dialogParams.supervisor.localize(
                    "dialog.update.backup"
                  )}
                </span>
                <span slot="description">
                  ${this._dialogParams.supervisor.localize(
                    "dialog.update.create_backup",
                    "name",
                    this._dialogParams.name
                  )}
                </span>
                <ha-switch
                  .checked=${this._createBackup}
                  haptic
                  @click=${this._toggleBackup}
                >
                </ha-switch>
              </ha-settings-row>
              <mwc-button @click=${this.closeDialog} slot="secondaryAction">
                ${this._dialogParams.supervisor.localize("common.cancel")}
              </mwc-button>
              <mwc-button
                .disabled=${this._error !== undefined}
                @click=${this._update}
                slot="primaryAction"
              >
                ${this._dialogParams.supervisor.localize("common.update")}
              </mwc-button>`
          : html`<ha-circular-progress alt="Updating" size="large" active>
              </ha-circular-progress>
              <p class="progress-text">
                ${this._action === "update"
                  ? this._dialogParams.supervisor.localize(
                      "dialog.update.updating",
                      "name",
                      this._dialogParams.name,
                      "version",
                      this._dialogParams.version
                    )
                  : this._dialogParams.supervisor.localize(
                      "dialog.update.creating_backup",
                      "name",
                      this._dialogParams.name
                    )}
              </p>`}
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : ""}
      </ha-dialog>
    `;
  }

  private _toggleBackup() {
    this._createBackup = !this._createBackup;
  }

  private async _update() {
    if (this._createBackup) {
      this._action = "backup";
      try {
        await createHassioPartialBackup(
          this.hass,
          this._dialogParams!.backupParams
        );
      } catch (err: any) {
        this._error = extractApiErrorMessage(err);
        this._action = null;
        return;
      }
    }

    this._action = "update";
    try {
      await this._dialogParams!.updateHandler!();
    } catch (err: any) {
      if (this.hass.connection.connected && !ignoreSupervisorError(err)) {
        this._error = extractApiErrorMessage(err);
        this._action = null;
      }
      return;
    }

    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        .form {
          color: var(--primary-text-color);
        }

        ha-settings-row {
          margin-top: 32px;
          padding: 0;
        }

        ha-circular-progress {
          display: block;
          margin: 32px;
          text-align: center;
        }

        .progress-text {
          text-align: center;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-supervisor-update": DialogSupervisorUpdate;
  }
}
