import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import { createCloseHeading } from "../../../../components/ha-dialog";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import { extractApiErrorMessage } from "../../../../data/hassio/common";
import { changeMountOptions } from "../../../../data/supervisor/mounts";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { LocalBackupLocationDialogParams } from "./show-dialog-local-backup-location";

const SCHEMA = [
  {
    name: "default_backup_mount",
    required: true,
    selector: { backup_location: {} },
  },
] as const satisfies HaFormSchema[];

@customElement("dialog-local-backup-location")
class LocalBackupLocationDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _dialogParams?: LocalBackupLocationDialogParams;

  @state() private _data?: { default_backup_mount: string | null };

  @state() private _waiting?: boolean;

  @state() private _error?: string;

  public async showDialog(
    dialogParams: LocalBackupLocationDialogParams
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
        .heading=${createCloseHeading(
          this.hass,
          this.hass.localize(
            `ui.panel.config.backup.dialogs.local_backup_location.title`
          )
        )}
        @closed=${this.closeDialog}
      >
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing}

        <p>
          ${this.hass.localize(
            `ui.panel.config.backup.dialogs.local_backup_location.description`
          )}
        </p>
        <ha-form
          .hass=${this.hass}
          .data=${this._data}
          .schema=${SCHEMA}
          .computeLabel=${this._computeLabelCallback}
          @value-changed=${this._valueChanged}
          dialogInitialFocus
        ></ha-form>
        <ha-alert alert-type="info">
          ${this.hass.localize(
            `ui.panel.config.backup.dialogs.local_backup_location.note`
          )}
        </ha-alert>
        <ha-button
          slot="secondaryAction"
          appearance="plain"
          @click=${this.closeDialog}
          dialogInitialFocus
        >
          ${this.hass.localize("ui.common.cancel")}
        </ha-button>
        <ha-button
          .disabled=${this._waiting || !this._data}
          slot="primaryAction"
          @click=${this._changeMount}
        >
          ${this.hass.localize("ui.common.save")}
        </ha-button>
      </ha-dialog>
    `;
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<typeof SCHEMA>
  ): string =>
    this.hass.localize(
      `ui.panel.config.backup.dialogs.local_backup_location.options.${schema.name}.name`
    ) || schema.name;

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
        ha-dialog {
          --mdc-dialog-max-width: 500px;
        }
        ha-form {
          display: block;
          margin-bottom: 16px;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-local-backup-location": LocalBackupLocationDialog;
  }
}
