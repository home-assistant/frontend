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
import {
  HassioAddonDetails,
  updateHassioAddon,
} from "../../../../src/data/hassio/addon";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import { createHassioPartialSnapshot } from "../../../../src/data/hassio/snapshot";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import type { HomeAssistant } from "../../../../src/types";
import { SupervisorDialogSupervisorAddonUpdateParams } from "./show-dialog-addon-update";

@customElement("dialog-supervisor-addon-update")
class DialogSupervisorAddonUpdate extends LitElement {
  public hass!: HomeAssistant;

  public addon!: HassioAddonDetails;

  @internalProperty() private _opened = false;

  @internalProperty() private _createSnapshot = true;

  @internalProperty() private _action: "snapshot" | "update" | null = null;

  @internalProperty() private _error?: string;

  public async showDialog(
    params: SupervisorDialogSupervisorAddonUpdateParams
  ): Promise<void> {
    this._opened = true;
    this.addon = params.addon;
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
        .heading="Update ${this.addon.name}"
        .open=${this._opened}
        scrimClickAction
        escapeKeyAction
        @closing=${this.closeDialog}
      >
        ${this._action === null
          ? html`<div>
                Are you sure you want to update this add-on to version
                ${this.addon.version_latest}?
              </div>

              <ha-settings-row>
                <span slot="heading">
                  Snapshot
                </span>
                <span slot="description">
                  Create a snapshot of the add-on before updating
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
          : html`<ha-circular-progress alt="Uploading" size="large" active>
              </ha-circular-progress>
              <p class="progress-text">
                ${this._action === "update"
                  ? `Update to version ${this.addon.version_latest} in progress`
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
          name: `addon_${this.addon.slug}_${this.addon.version}`,
          addons: [this.addon.slug],
          homeassistant: false,
        });
      } catch (err) {
        this._error = extractApiErrorMessage(err);
        this._action = null;
        return;
      }
    }

    this._action = "update";
    try {
      await updateHassioAddon(this.hass, this.addon.slug);
    } catch (err) {
      this._error = extractApiErrorMessage(err);
      this._action = null;
      return;
    }
    fireEvent(this, "supervisor-colllection-refresh", { colllection: "addon" });
    fireEvent(this, "supervisor-colllection-refresh", {
      colllection: "supervisor",
    });
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
    "dialog-supervisor-addon-update": DialogSupervisorAddonUpdate;
  }
}
