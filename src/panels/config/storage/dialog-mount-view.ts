import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import "../../../components/ha-form/ha-form";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import {
  createSupervisorMount,
  removeSupervisorMount,
  SupervisorMountRequestParams,
  SupervisorMountType,
  SupervisorMountUsage,
  updateSupervisorMount,
} from "../../../data/supervisor/mounts";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import { HomeAssistant } from "../../../types";
import { MountViewDialogParams } from "./show-dialog-view-mount";
import { LocalizeFunc } from "../../../common/translations/localize";
import type { SchemaUnion } from "../../../components/ha-form/types";

const mountSchema = memoizeOne(
  (
    localize: LocalizeFunc,
    existing?: boolean,
    mountType?: SupervisorMountType
  ) =>
    [
      {
        name: "name",
        required: true,
        disabled: existing,
        selector: { text: {} },
      },
      {
        name: "usage",
        required: true,
        type: "select",
        options: [
          [
            SupervisorMountUsage.BACKUP,
            localize(
              "ui.panel.config.storage.network_mounts.mount_usage.backup"
            ),
          ],
          [
            SupervisorMountUsage.MEDIA,
            localize(
              "ui.panel.config.storage.network_mounts.mount_usage.media"
            ),
          ],
          [
            SupervisorMountUsage.SHARE,
            localize(
              "ui.panel.config.storage.network_mounts.mount_usage.share"
            ),
          ],
        ] as const,
      },
      {
        name: "server",
        required: true,
        selector: { text: {} },
      },
      {
        name: "type",
        required: true,
        type: "select",
        options: [
          [
            SupervisorMountType.CIFS,
            localize("ui.panel.config.storage.network_mounts.mount_type.cifs"),
          ],
          [
            SupervisorMountType.NFS,
            localize("ui.panel.config.storage.network_mounts.mount_type.nfs"),
          ],
        ],
      },
      ...(mountType === "nfs"
        ? ([
            {
              name: "path",
              required: true,
              selector: { text: {} },
            },
          ] as const)
        : mountType === "cifs"
        ? ([
            {
              name: "share",
              required: true,
              selector: { text: {} },
            },
            {
              name: "username",
              required: false,
              selector: { text: {} },
            },
            {
              name: "password",
              required: false,
              selector: { text: { type: "password" } },
            },
          ] as const)
        : ([] as const)),
    ] as const
);

@customElement("dialog-mount-view")
class ViewMountDialog extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _data?: SupervisorMountRequestParams;

  @state() private _waiting?: boolean;

  @state() private _error?: string;

  @state() private _validationError?: Record<string, string>;

  @state() private _existing?: boolean;

  @state() private _reloadMounts?: () => void;

  public async showDialog(
    dialogParams: MountViewDialogParams
  ): Promise<Promise<void>> {
    this._data = dialogParams.mount;
    this._existing = dialogParams.mount !== undefined;
    this._reloadMounts = dialogParams.reloadMounts;
  }

  public closeDialog(): void {
    this._data = undefined;
    this._waiting = undefined;
    this._error = undefined;
    this._validationError = undefined;
    this._existing = undefined;
    this._reloadMounts = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (this._existing === undefined) {
      return nothing;
    }
    return html`
      <ha-dialog
        open
        scrimClickAction
        escapeKeyAction
        .heading=${this._existing
          ? this.hass.localize(
              "ui.panel.config.storage.network_mounts.update_title"
            )
          : this.hass.localize(
              "ui.panel.config.storage.network_mounts.add_title"
            )}
        @closed=${this.closeDialog}
      >
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing}
        <ha-form
          .data=${this._data}
          .schema=${mountSchema(
            this.hass.localize,
            this._existing,
            this._data?.type
          )}
          .error=${this._validationError}
          .computeLabel=${this._computeLabelCallback}
          .computeHelper=${this._computeHelperCallback}
          .computeError=${this._computeErrorCallback}
          @value-changed=${this._valueChanged}
          dialogInitialFocus
        ></ha-form>
        <div slot="secondaryAction">
          <mwc-button @click=${this.closeDialog} dialogInitialFocus>
            ${this.hass.localize("ui.common.cancel")}
          </mwc-button>
          ${this._existing
            ? html`<mwc-button @click=${this._deleteMount} class="delete-btn">
                ${this.hass.localize("ui.common.delete")}
              </mwc-button>`
            : nothing}
        </div>

        <mwc-button
          .disabled=${this._waiting}
          slot="primaryAction"
          @click=${this._connectMount}
        >
          ${this._existing
            ? this.hass.localize(
                "ui.panel.config.storage.network_mounts.update"
              )
            : this.hass.localize(
                "ui.panel.config.storage.network_mounts.connect"
              )}
        </mwc-button>
      </ha-dialog>
    `;
  }

  private _computeLabelCallback = (
    // @ts-ignore
    schema: SchemaUnion<ReturnType<typeof mountSchema>>
  ): string =>
    this.hass.localize(
      `ui.panel.config.storage.network_mounts.options.${schema.name}.title`
    );

  private _computeHelperCallback = (
    // @ts-ignore
    schema: SchemaUnion<ReturnType<typeof mountSchema>>
  ): string =>
    this.hass.localize(
      `ui.panel.config.storage.network_mounts.options.${schema.name}.description`
    );

  private _computeErrorCallback = (error: string): string =>
    this.hass.localize(
      // @ts-ignore
      `ui.panel.config.storage.network_mounts.errors.${error}`
    ) || error;

  private _valueChanged(ev: CustomEvent) {
    this._validationError = {};
    this._data = ev.detail.value;
    if (this._data?.name && !/^\w+$/.test(this._data.name)) {
      this._validationError.name = "invalid_name";
    }
  }

  private async _connectMount() {
    this._error = undefined;
    this._waiting = true;
    try {
      if (this._existing) {
        await updateSupervisorMount(this.hass, this._data!);
      } else {
        await createSupervisorMount(this.hass, this._data!);
      }
    } catch (err: any) {
      this._error = extractApiErrorMessage(err);
      this._waiting = false;
      return;
    }
    if (this._reloadMounts) {
      this._reloadMounts();
    }
    this.closeDialog();
  }

  private async _deleteMount() {
    this._error = undefined;
    this._waiting = true;
    try {
      await removeSupervisorMount(this.hass, this._data!.name);
    } catch (err: any) {
      this._error = extractApiErrorMessage(err);
      this._waiting = false;
      return;
    }
    if (this._reloadMounts) {
      this._reloadMounts();
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
    "dialog-mount-view": ViewMountDialog;
  }
}
