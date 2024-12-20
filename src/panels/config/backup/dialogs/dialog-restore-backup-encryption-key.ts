import { mdiClose } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../../common/dom/fire_event";
import "../../../../components/ha-button";
import "../../../../components/ha-dialog-header";
import "../../../../components/ha-form/ha-form";
import type {
  HaFormSchema,
  SchemaUnion,
} from "../../../../components/ha-form/types";
import "../../../../components/ha-icon-button";
import "../../../../components/ha-md-dialog";
import type { HaMdDialog } from "../../../../components/ha-md-dialog";
import "../../../../components/ha-svg-icon";
import { fetchBackupConfig } from "../../../../data/backup";
import type { HassDialog } from "../../../../dialogs/make-dialog-manager";
import { haStyle, haStyleDialog } from "../../../../resources/styles";
import type { HomeAssistant } from "../../../../types";
import type { RestoreBackupEncryptionKeyDialogParams } from "./show-dialog-restore-backup-encryption-key";

type FormData = {
  encryption_key_type: "config" | "custom";
  custom_encryption_key: string;
};

const INITIAL_DATA: FormData = {
  encryption_key_type: "config",
  custom_encryption_key: "",
};

@customElement("ha-dialog-restore-backup-encryption-key")
class DialogRestoreBackupEncryptionKey
  extends LitElement
  implements HassDialog
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _params?: RestoreBackupEncryptionKeyDialogParams;

  @state() private _formData?: FormData;

  @state() private _backupEncryptionKey?: string;

  @query("ha-md-dialog") private _dialog?: HaMdDialog;

  public showDialog(_params: RestoreBackupEncryptionKeyDialogParams): void {
    this._params = _params;
    this._formData = INITIAL_DATA;
    this._fetchEncryptionKey();
  }

  private _dialogClosed() {
    if (this._params!.cancel) {
      this._params!.cancel();
    }
    this._formData = undefined;
    this._params = undefined;
    this._backupEncryptionKey = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  private async _fetchEncryptionKey() {
    try {
      const { config } = await fetchBackupConfig(this.hass);
      this._backupEncryptionKey = config.create_backup.password || undefined;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    }
  }

  public closeDialog() {
    this._dialog?.close();
  }

  private _schema = memoizeOne(
    (hasEncryptionKey: boolean, type: "config" | "custom") =>
      [
        ...(hasEncryptionKey
          ? [
              {
                name: "encryption_key_type",
                selector: {
                  select: {
                    options: [
                      {
                        value: "config",
                        label: "Use backup encryption key",
                      },
                      {
                        value: "custom",
                        label: "Enter encryption key",
                      },
                    ],
                  },
                },
                context: {
                  filter_entity: "entity",
                },
              },
            ]
          : []),
        ...(!hasEncryptionKey || type === "custom"
          ? ([
              {
                name: "custom_encryption_key",
                selector: {
                  text: {},
                },
              },
            ] as const satisfies readonly HaFormSchema[])
          : []),
      ] as const satisfies readonly HaFormSchema[]
  );

  protected render() {
    if (!this._params || !this._formData) {
      return nothing;
    }

    const dialogTitle = "Restore backup";

    const hasEncryptionKey = this._backupEncryptionKey != null;

    const schema = this._schema(
      hasEncryptionKey,
      this._formData.encryption_key_type
    );

    return html`
      <ha-md-dialog open @closed=${this._dialogClosed}>
        <ha-dialog-header slot="headline">
          <ha-icon-button
            slot="navigationIcon"
            .label=${this.hass.localize("ui.dialogs.generic.close")}
            .path=${mdiClose}
            @click=${this.closeDialog}
          ></ha-icon-button>
          <span slot="title" .title=${dialogTitle}>${dialogTitle}</span>
        </ha-dialog-header>
        <div slot="content" class="content">
          <p>
            ${hasEncryptionKey
              ? "The backup is encrypted. Which encryption key would you like to use to decrypt the backup?"
              : "The backup is encrypted. Provide the encryption key to decrypt the backup."}
          </p>
          <ha-form
            .schema=${schema}
            .data=${this._formData}
            @value-changed=${this._valueChanged}
            .computeLabel=${this._computeLabelCallback}
          >
          </ha-form>
        </div>
        <div slot="actions">
          <ha-button @click=${this.closeDialog}>Cancel</ha-button>
          <ha-button
            @click=${this._submit}
            class="danger"
            .disabled=${!this._getKey()}
          >
            Restore
          </ha-button>
        </div>
      </ha-md-dialog>
    `;
  }

  private _valueChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    this._formData = ev.detail.value;
  }

  private _computeLabelCallback = (
    schema: SchemaUnion<ReturnType<typeof this._schema>>
  ) => {
    switch (schema.name) {
      case "encryption_key_type":
        return "";
      case "custom_encryption_key":
        return "Encryption key";
      default:
        return "";
    }
  };

  private _getKey() {
    if (!this._formData) {
      return undefined;
    }
    const hasEncryptionKey = this._backupEncryptionKey != null;

    if (hasEncryptionKey) {
      return this._formData.encryption_key_type === "config"
        ? this._backupEncryptionKey
        : this._formData.custom_encryption_key;
    }

    return this._formData.custom_encryption_key;
  }

  private async _submit() {
    if (!this._formData) {
      return;
    }

    const key = this._getKey();

    if (!key) {
      return;
    }

    this._params!.submit?.(key!);
    this.closeDialog();
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      haStyleDialog,
      css`
        ha-md-dialog {
          max-width: 500px;
          width: 100%;
          --dialog-content-padding: 8px 24px;
        }
        .content p {
          margin: 0 0 16px;
        }
        ha-button.danger {
          --mdc-theme-primary: var(--error-color);
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-dialog-restore-backup-encryption-key": DialogRestoreBackupEncryptionKey;
  }
}
