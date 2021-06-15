import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, TemplateResult } from "lit";
import { customElement, state } from "lit/decorators";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-checkbox";
import "../../../../src/components/ha-circular-progress";
import "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-settings-row";
import "../../../../src/components/ha-svg-icon";
import {
  extractApiErrorMessage,
  ignoreSupervisorError,
} from "../../../../src/data/hassio/common";
import {
  SupervisorFrontendPrefrences,
  fetchSupervisorFrontendPreferences,
  saveSupervisorFrontendPreferences,
} from "../../../../src/data/supervisor/supervisor";
import { createHassioPartialSnapshot } from "../../../../src/data/hassio/snapshot";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { SupervisorDialogSupervisorUpdateParams } from "./show-dialog-update";
import memoizeOne from "memoize-one";

const snapshot_before_update = memoizeOne(
  (slug: string, frontendPrefrences: SupervisorFrontendPrefrences) =>
    slug in frontendPrefrences.snapshot_before_update
      ? frontendPrefrences.snapshot_before_update[slug]
      : true
);

@customElement("dialog-supervisor-update")
class DialogSupervisorUpdate extends LitElement {
  public hass!: HomeAssistant;

  @state() private _opened = false;

  @state() private _action: "snapshot" | "update" | null = null;

  @state() private _error?: string;

  @state() private _frontendPrefrences?: SupervisorFrontendPrefrences;

  @state()
  private _dialogParams?: SupervisorDialogSupervisorUpdateParams;

  public async showDialog(
    params: SupervisorDialogSupervisorUpdateParams
  ): Promise<void> {
    this._opened = true;
    this._dialogParams = params;
    this._frontendPrefrences = await fetchSupervisorFrontendPreferences(
      this.hass
    );
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._action = null;
    this._error = undefined;
    this._dialogParams = undefined;
    this._frontendPrefrences = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  public focus(): void {
    this.updateComplete.then(() =>
      (this.shadowRoot?.querySelector(
        "[dialogInitialFocus]"
      ) as HTMLElement)?.focus()
    );
  }

  protected render(): TemplateResult {
    if (!this._dialogParams || !this._frontendPrefrences) {
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
                <ha-checkbox
                  .checked=${snapshot_before_update(
                    this._dialogParams.slug,
                    this._frontendPrefrences
                  )}
                  haptic
                  @click=${this._toggleSnapshot}
                  slot="prefix"
                >
                </ha-checkbox>
                <span slot="heading">
                  ${this._dialogParams.supervisor.localize(
                    "dialog.update.snapshot"
                  )}
                </span>
                <span slot="description">
                  ${this._dialogParams.supervisor.localize(
                    "dialog.update.create_snapshot",
                    "name",
                    this._dialogParams.name
                  )}
                </span>
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
                      "dialog.update.snapshotting",
                      "name",
                      this._dialogParams.name
                    )}
              </p>`}
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}
      </ha-dialog>
    `;
  }

  private async _toggleSnapshot(): Promise<void> {
    this._frontendPrefrences!.snapshot_before_update[
      this._dialogParams!.slug
    ] = !snapshot_before_update(
      this._dialogParams!.slug,
      this._frontendPrefrences!
    );

    await saveSupervisorFrontendPreferences(
      this.hass,
      this._frontendPrefrences!
    );
  }

  private async _update() {
    if (
      snapshot_before_update(
        this._dialogParams!.slug,
        this._frontendPrefrences!
      )
    ) {
      this._action = "snapshot";
      try {
        await createHassioPartialSnapshot(
          this.hass,
          this._dialogParams!.snapshotParams
        );
      } catch (err) {
        this._error = extractApiErrorMessage(err);
        this._action = null;
        return;
      }
    }

    this._action = "update";
    try {
      await this._dialogParams!.updateHandler!();
    } catch (err) {
      if (this.hass.connection.connected && !ignoreSupervisorError(err)) {
        this._error = extractApiErrorMessage(err);
      }
      this._action = null;
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
