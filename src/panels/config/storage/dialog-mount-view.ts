import { mdiHelpCircle } from "@mdi/js";
import { css, CSSResultGroup, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import { LocalizeFunc } from "../../../common/translations/localize";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import "../../../components/buttons/ha-progress-button";
import type { HaProgressButton } from "../../../components/buttons/ha-progress-button";
import "../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../components/ha-form/types";
import "../../../components/ha-icon-button";
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
import { documentationUrl } from "../../../util/documentation-url";
import { MountViewDialogParams } from "./show-dialog-view-mount";

const mountSchema = memoizeOne(
  (
    localize: LocalizeFunc,
    existing?: boolean,
    mountType?: SupervisorMountType,
    showCIFSVersion?: boolean
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
            ...(showCIFSVersion
              ? ([
                  {
                    name: "version",
                    required: true,
                    selector: {
                      select: {
                        options: [
                          {
                            label: localize(
                              "ui.panel.config.storage.network_mounts.cifs_versions.auto"
                            ),
                            value: "auto",
                          },
                          {
                            label: localize(
                              "ui.panel.config.storage.network_mounts.cifs_versions.legacy",
                              { version: "2.0" }
                            ),
                            value: "2.0",
                          },
                          {
                            label: localize(
                              "ui.panel.config.storage.network_mounts.cifs_versions.legacy",
                              { version: "1.0" }
                            ),
                            value: "1.0",
                          },
                        ],
                        mode: "dropdown",
                      },
                    },
                  },
                ] as const)
              : ([] as const)),
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

  @state() private _validationWarning?: Record<string, string>;

  @state() private _existing?: boolean;

  @state() private _showCIFSVersion?: boolean;

  @state() private _reloadMounts?: () => void;

  public async showDialog(
    dialogParams: MountViewDialogParams
  ): Promise<Promise<void>> {
    this._data = dialogParams.mount;
    this._existing = dialogParams.mount !== undefined;
    this._reloadMounts = dialogParams.reloadMounts;
    if (
      dialogParams.mount?.type === "cifs" &&
      dialogParams.mount.version &&
      dialogParams.mount.version !== "auto"
    ) {
      this._showCIFSVersion = true;
    }
  }

  public closeDialog(): void {
    this._data = undefined;
    this._waiting = undefined;
    this._error = undefined;
    this._validationError = undefined;
    this._validationWarning = undefined;
    this._existing = undefined;
    this._showCIFSVersion = undefined;
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
        <ha-dialog-header slot="heading">
          <span slot="title"
            >${this._existing
              ? this.hass.localize(
                  "ui.panel.config.storage.network_mounts.update_title"
                )
              : this.hass.localize(
                  "ui.panel.config.storage.network_mounts.add_title"
                )}
          </span>
          <a
            slot="actionItems"
            class="header_button"
            href=${documentationUrl(
              this.hass,
              "/common-tasks/os#network-storage"
            )}
            title=${this.hass.localize(
              "ui.panel.config.storage.network_mounts.documentation"
            )}
            target="_blank"
            rel="noreferrer"
            dir=${computeRTLDirection(this.hass)}
          >
            <ha-icon-button .path=${mdiHelpCircle}></ha-icon-button>
          </a>
        </ha-dialog-header>
        ${this._error
          ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
          : nothing}
        <ha-form
          .data=${this._data}
          .schema=${mountSchema(
            this.hass.localize,
            this._existing,
            this._data?.type,
            this._showCIFSVersion
          )}
          .error=${this._validationError}
          .warning=${this._validationWarning}
          .computeLabel=${this._computeLabelCallback}
          .computeHelper=${this._computeHelperCallback}
          .computeError=${this._computeErrorCallback}
          .computeWarning=${this._computeWarningCallback}
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

        <ha-progress-button
          .progress=${this._waiting}
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
        </ha-progress-button>
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

  private _computeWarningCallback = (warning: string): string =>
    this.hass.localize(
      // @ts-ignore
      `ui.panel.config.storage.network_mounts.warnings.${warning}`
    ) || warning;

  private _valueChanged(ev: CustomEvent) {
    this._validationError = {};
    this._validationWarning = {};
    this._data = ev.detail.value;
    if (this._data?.name && !/^\w+$/.test(this._data.name)) {
      this._validationError.name = "invalid_name";
    }
    if (this._data?.type === "cifs" && !this._data.version) {
      this._data.version = "auto";
    }
    if (
      this._data?.type === "cifs" &&
      this._data.version &&
      ["1.0", "2.0"].includes(this._data.version)
    ) {
      this._validationWarning.version = "not_recomeded_cifs_version";
    }
  }

  private async _connectMount(ev) {
    const progressButton = ev.target as HaProgressButton;
    this._error = undefined;
    this._waiting = true;
    const mountData = { ...this._data! };
    if (mountData.type === "cifs" && mountData.version === "auto") {
      mountData.version = undefined;
    }
    try {
      if (this._existing) {
        await updateSupervisorMount(this.hass, mountData);
      } else {
        await createSupervisorMount(this.hass, mountData);
      }
    } catch (err: any) {
      this._error = extractApiErrorMessage(err);
      this._waiting = false;
      progressButton.actionError();
      if (this._data!.type === "cifs" && !this._showCIFSVersion) {
        this._showCIFSVersion = true;
      }
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
        ha-icon-button {
          color: var(--primary-text-color);
        }
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
