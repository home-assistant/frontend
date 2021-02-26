import "@material/mwc-button/mwc-button";
import {
  css,
  CSSResult,
  customElement,
  html,
  internalProperty,
  LitElement,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-circular-progress";
import "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-settings-row";
import "../../../../src/components/ha-svg-icon";
import "../../../../src/components/ha-switch";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import { createHassioPartialSnapshot } from "../../../../src/data/hassio/snapshot";
import { HassioHomeAssistantInfo } from "../../../../src/data/hassio/supervisor";
import { updateCore } from "../../../../src/data/supervisor/core";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { SupervisorDialogSupervisorCoreUpdateParams } from "./show-dialog-core-update";

@customElement("dialog-supervisor-core-update")
class DialogSupervisorCoreUpdate extends LitElement {
  public hass!: HomeAssistant;

  public core!: HassioHomeAssistantInfo;

  @internalProperty() private _opened = false;

  @internalProperty() private _createSnapshot = true;

  @internalProperty() private _action: "snapshot" | "update" | null = null;

  @internalProperty() private _error?: string;

  public async showDialog(
    params: SupervisorDialogSupervisorCoreUpdateParams
  ): Promise<void> {
    this._opened = true;
    this.core = params.core;
    await this.updateComplete;
  }

  public closeDialog(): void {
    this._action = null;
    this._createSnapshot = true;
    this._opened = false;
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
    return html`
      <ha-dialog
        .open=${this._opened}
        heading="Update Home Assistant Core"
        scrimClickAction
        escapeKeyAction
      >
        ${this._action === null
          ? html`<div>
                Are you sure you want to update Home Assistant Core to version
                ${this.core.version_latest}?
              </div>

              <ha-settings-row three-rows>
                <span slot="heading">
                  Snapshot
                </span>
                <span slot="description">
                  Create a snapshot of Home Assistant Core before updating
                </span>
                <ha-switch
                  .checked=${this._createSnapshot}
                  haptic
                  title="Create snapshot"
                  @click=${this._toggleSnapshot}
                >
                </ha-switch>
              </ha-settings-row>
              <mwc-button @click=${this.closeDialog} slot="secondaryAction">
                Cancel
              </mwc-button>
              <mwc-button @click=${this._update} slot="primaryAction">
                Update
              </mwc-button>`
          : html`<ha-circular-progress alt="Updating" size="large" active>
              </ha-circular-progress>
              <p class="progress-text">
                ${this._action === "update"
                  ? `Update to version ${this.core.version_latest} in progress`
                  : "Creating snapshot in progress"}
              </p>`}
        ${this._error ? html`<p class="error">${this._error}</p>` : ""}
      </ha-dialog>
    `;
  }

  private _toggleSnapshot() {
    this._createSnapshot = !this._createSnapshot;
  }

  private async _update() {
    if (this._createSnapshot) {
      this._action = "snapshot";
      try {
        await createHassioPartialSnapshot(this.hass, {
          name: `core_${this.core.version}`,
          folders: ["homeassistant"],
          homeassistant: true,
        });
      } catch (err) {
        this._error = extractApiErrorMessage(err);
        this._action = null;
        return;
      }
    }

    this._action = "update";
    try {
      await updateCore(this.hass);
    } catch (err) {
      this._error = extractApiErrorMessage(err);
      this._action = null;
      return;
    }
    fireEvent(this, "supervisor-colllection-refresh", { colllection: "core" });
    this.closeDialog();
  }

  static get styles(): CSSResult[] {
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
    "dialog-supervisor-core-update": DialogSupervisorCoreUpdate;
  }
}
