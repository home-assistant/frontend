import "@material/mwc-button/mwc-button";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../src/common/dom/fire_event";
import "../../../../src/components/ha-dialog";
import "../../../../src/components/ha-form/ha-form";
import type { SchemaUnion } from "../../../../src/components/ha-form/types";
import { extractApiErrorMessage } from "../../../../src/data/hassio/common";
import { changeMountOptions } from "../../../../src/data/supervisor/mounts";
import { haStyle, haStyleDialog } from "../../../../src/resources/styles";
import { HomeAssistant } from "../../../../src/types";
import { HassioBackupLocationDialogParams } from "./show-dialog-hassio-backu-location";

const SCHEMA = memoizeOne(
  () =>
    [
      {
        name: "default_backup_mount",
        required: true,
        selector: { backup_location: {} },
      },
    ] as const
);

@customElement("dialog-hassio-backup-location")
class HassioBackupLocationDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false })
  public _dialogParams?: HassioBackupLocationDialogParams;

  @state() private _data?: { default_backup_mount: string | null };

  @state() private _waiting?: boolean;

  @state() private _error?: string;

  public async showDialog(
    dialogParams: HassioBackupLocationDialogParams
  ): Promise<void> {
    this._dialogParams = dialogParams;
  }

  public closeDialog(): void {
    this._data = undefined;
    this._error = undefined;
    this._waiting = undefined;
    this._dialogParams = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (!this._dialogParams) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        .heading=${this._dialogParams.supervisor.localize(
          "dialog.backup_location.title"
        )}
        @closed=${this.closeDialog}
      >
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing}

        <ha-form
          .hass=${this.hass}
          .data=${this._data}
          .schema=${SCHEMA()}
          .computeLabel=${this._computeLabelCallback}
          .computeHelper=${this._computeHelperCallback}
          @value-changed=${this._valueChanged}
          dialogInitialFocus
        ></ha-form>
        <mwc-button
          slot="secondaryAction"
          @click=${this.closeDialog}
          dialogInitialFocus
        >
          ${this._dialogParams.supervisor.localize("common.cancel")}
        </mwc-button>
        <mwc-button
          .disabled=${this._waiting || !this._data}
          slot="primaryAction"
          @click=${this._changeMount}
        >
          ${this._dialogParams.supervisor.localize("common.save")}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _computeLabelCallback = (
    // @ts-ignore
    schema: SchemaUnion<ReturnType<typeof SCHEMA>>
  ): string =>
    this._dialogParams!.supervisor.localize(
      `dialog.backup_location.options.${schema.name}.name`
    ) || schema.name;

  private _computeHelperCallback = (
    // @ts-ignore
    schema: SchemaUnion<ReturnType<typeof SCHEMA>>
  ): string =>
    this._dialogParams!.supervisor.localize(
      `dialog.backup_location.options.${schema.name}.description`
    );

  private _valueChanged(ev: CustomEvent) {
    const newLocation = ev.detail.value.default_backup_mount;
    this._data = {
      default_backup_mount: newLocation === "/backup" ? null : newLocation,
    };
  }

  private async _changeMount() {
    if (!this._data) {
      return;
    }
    this._error = undefined;
    this._waiting = true;
    try {
      await changeMountOptions(this.hass, this._data);
    } catch (err: any) {
      this._error = extractApiErrorMessage(err);
      this._waiting = false;
      return;
    }
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        .delete-btn {
          --mdc-theme-primary: var(--error-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-hassio-backup-location": HassioBackupLocationDialog;
  }
}
