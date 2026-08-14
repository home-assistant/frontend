import { mdiHelpCircleOutline } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../../common/dom/fire_event";
import type { LocalizeFunc } from "../../../common/translations/localize";
import { computeRTLDirection } from "../../../common/util/compute_rtl";
import "../../../components/buttons/ha-progress-button";
import type { HaProgressButton } from "../../../components/buttons/ha-progress-button";
import "../../../components/ha-dialog-footer";
import "../../../components/ha-form/ha-form";
import type { SchemaUnion } from "../../../components/ha-form/types";
import "../../../components/ha-icon-button";
import "../../../components/ha-dialog";
import { extractApiErrorMessage } from "../../../data/hassio/common";
import type {
  SupervisorMountCandidate,
  SupervisorMountRequestParams,
} from "../../../data/supervisor/mounts";
import {
  createSupervisorMount,
  fetchSupervisorMountCandidates,
  removeSupervisorMount,
  SupervisorMountType,
  SupervisorMountUsage,
  updateSupervisorMount,
} from "../../../data/supervisor/mounts";
import { bytesToString } from "../../../util/bytes-to-string";
import { DirtyStateProviderMixin } from "../../../mixins/dirty-state-provider-mixin";
import { haStyle, haStyleDialog } from "../../../resources/styles";
import type { HomeAssistant } from "../../../types";
import { documentationUrl } from "../../../util/documentation-url";
import type { MountViewDialogParams } from "./show-dialog-view-mount";

// Describes a device by the drive it belongs to, falling back to what UDisks2
// did report: an unattributed device has no drive, and an unformatted-label
// partition has no label.
const mountCandidateLabel = (candidate: SupervisorMountCandidate): string => {
  const drive = [candidate.drive?.vendor, candidate.drive?.model]
    .filter(Boolean)
    .join(" ");
  const identity = candidate.label || candidate.device;
  const size = bytesToString(candidate.size);
  return drive ? `${drive} — ${identity}, ${size}` : `${identity}, ${size}`;
};

const mountSchema = memoizeOne(
  (
    localize: LocalizeFunc,
    existing?: boolean,
    mountType?: SupervisorMountType,
    showCIFSVersion?: boolean,
    showDisk?: boolean,
    candidates?: SupervisorMountCandidate[],
    diskIdentity?: string,
    readOnlyForced?: boolean,
    allowBackupUsage = true
  ) => {
    // Supervisor rejects a read-only mount used for backups, so a device that
    // can only be mounted read-only is not offered for one.
    const usageOptions: [string, string][] = allowBackupUsage
      ? [
          [
            SupervisorMountUsage.BACKUP,
            localize(
              "ui.panel.config.storage.network_mounts.mount_usage.backup"
            ),
          ],
        ]
      : [];
    usageOptions.push(
      [
        SupervisorMountUsage.MEDIA,
        localize("ui.panel.config.storage.network_mounts.mount_usage.media"),
      ],
      [
        SupervisorMountUsage.SHARE,
        localize("ui.panel.config.storage.network_mounts.mount_usage.share"),
      ]
    );

    const typeOptions: [string, string][] = [
      [
        SupervisorMountType.CIFS,
        localize("ui.panel.config.storage.network_mounts.mount_type.cifs"),
      ],
      [
        SupervisorMountType.NFS,
        localize("ui.panel.config.storage.network_mounts.mount_type.nfs"),
      ],
    ];
    // Hidden on a Supervisor that does not support disk mounts, but always
    // offered when editing one that already exists.
    if (showDisk || mountType === SupervisorMountType.DISK) {
      typeOptions.push([
        SupervisorMountType.DISK,
        localize("ui.panel.config.storage.network_mounts.mount_type.disk"),
      ]);
    }

    return [
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
        options: usageOptions,
      },
      {
        name: "type",
        required: true,
        type: "select",
        options: typeOptions,
      },
      ...(mountType === SupervisorMountType.NFS
        ? ([
            {
              name: "server",
              required: true,
              selector: { text: {} },
            },
            {
              name: "path",
              required: true,
              selector: { text: {} },
            },
          ] as const)
        : mountType === SupervisorMountType.CIFS
          ? ([
              {
                name: "server",
                required: true,
                selector: { text: {} },
              },
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
          : mountType === SupervisorMountType.DISK
            ? existing
              ? // Supervisor excludes a mounted device from the candidates, so
                // an existing mount can only show what it resolved to.
                ([
                  {
                    name: "device_identity",
                    type: "constant",
                    value: diskIdentity,
                  },
                  {
                    name: "read_only",
                    selector: { boolean: {} },
                  },
                ] as const)
              : ([
                  {
                    name: "device",
                    required: true,
                    selector: {
                      select: {
                        options: (candidates ?? []).map((candidate) => ({
                          value: candidate.device,
                          label: mountCandidateLabel(candidate),
                        })),
                        mode: "dropdown",
                      },
                    },
                  },
                  {
                    name: "read_only",
                    disabled: readOnlyForced,
                    selector: { boolean: {} },
                  },
                ] as const)
            : ([] as const)),
    ] as const;
  }
);

@customElement("dialog-mount-view")
class ViewMountDialog extends DirtyStateProviderMixin<
  Partial<SupervisorMountRequestParams>
>()(LitElement) {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _data?: SupervisorMountRequestParams;

  @state() private _waiting?: boolean;

  @state() private _error?: string;

  @state() private _validationError?: Record<string, string>;

  @state() private _validationWarning?: Record<string, string>;

  @state() private _existing?: boolean;

  @state() private _showCIFSVersion?: boolean;

  @state() private _candidates?: SupervisorMountCandidate[];

  @state() private _diskSupported = false;

  @state() private _diskIdentity?: string;

  @state() private _reloadMounts?: () => void;

  @state() private _open = false;

  public async showDialog(
    dialogParams: MountViewDialogParams
  ): Promise<Promise<void>> {
    this._data = dialogParams.mount;
    this._existing = dialogParams.mount !== undefined;
    this._reloadMounts = dialogParams.reloadMounts;
    this._open = true;
    if (
      dialogParams.mount?.type === "cifs" &&
      dialogParams.mount.version &&
      dialogParams.mount.version !== "auto"
    ) {
      this._showCIFSVersion = true;
    }
    if (dialogParams.mount?.type === SupervisorMountType.DISK) {
      this._diskIdentity = [
        dialogParams.mount.filesystem,
        dialogParams.mount.uuid,
      ]
        .filter(Boolean)
        .join(" • ");
    }
    this._initDirtyTracking({ type: "deep" }, this._data ?? {});
    this._loadCandidates();
  }

  public closeDialog(): void {
    this._open = false;
  }

  private async _loadCandidates(): Promise<void> {
    try {
      const { candidates } = await fetchSupervisorMountCandidates(this.hass);
      this._candidates = candidates;
      this._diskSupported = true;
    } catch (_err: any) {
      // A Supervisor predating disk mounts answers 404. Any other failure
      // leaves us unable to offer a device either, so in both cases the option
      // is hidden rather than shown as broken.
      this._candidates = [];
      this._diskSupported = false;
    }
  }

  private _dialogClosed(): void {
    this._data = undefined;
    this._waiting = undefined;
    this._error = undefined;
    this._validationError = undefined;
    this._validationWarning = undefined;
    this._existing = undefined;
    this._showCIFSVersion = undefined;
    this._candidates = undefined;
    this._diskSupported = false;
    this._diskIdentity = undefined;
    this._reloadMounts = undefined;
    fireEvent(this, "dialog-closed", { dialog: this.localName });
  }

  protected render() {
    if (this._existing === undefined) {
      return nothing;
    }
    return html`
      <ha-dialog
        .open=${this._open}
        header-title=${
          this._existing
            ? this.hass.localize(
                "ui.panel.config.storage.network_mounts.update_title"
              )
            : this.hass.localize(
                "ui.panel.config.storage.network_mounts.add_title"
              )
        }
        .preventScrimClose=${this.isDirtyState}
        @closed=${this._dialogClosed}
      >
        <a
          slot="headerActionItems"
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
          <ha-icon-button .path=${mdiHelpCircleOutline}></ha-icon-button>
        </a>
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing
        }
        ${
          this._showNoCandidates
            ? html`<ha-alert alert-type="info">
                ${this.hass.localize(
                  "ui.panel.config.storage.network_mounts.no_disk_candidates"
                )}
              </ha-alert>`
            : nothing
        }
        <ha-form
          autofocus
          .data=${this._data}
          .schema=${mountSchema(
            this.hass.localize,
            this._existing,
            this._data?.type,
            this._showCIFSVersion,
            this._diskSupported,
            this._candidates,
            this._diskIdentity,
            this._readOnlyForced,
            this._allowBackupUsage
          )}
          .error=${this._validationError}
          .warning=${this._validationWarning}
          .computeLabel=${this._computeLabelCallback}
          .computeHelper=${this._computeHelperCallback}
          .computeError=${this._computeErrorCallback}
          .computeWarning=${this._computeWarningCallback}
          @value-changed=${this._valueChanged}
        ></ha-form>

        <ha-dialog-footer slot="footer">
          ${
            this._existing
              ? html`<ha-button
                  @click=${this._deleteMount}
                  variant="danger"
                  slot="secondaryAction"
                  appearance="plain"
                >
                  ${this.hass.localize("ui.common.delete")}
                </ha-button>`
              : nothing
          }
          <ha-button
            slot="secondaryAction"
            appearance="plain"
            @click=${this.closeDialog}
          >
            ${this.hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-progress-button
            slot="primaryAction"
            .progress=${!!this._waiting}
            .disabled=${!this.isDirtyState}
            @click=${this._connectMount}
          >
            ${
              this._existing
                ? this.hass.localize(
                    "ui.panel.config.storage.network_mounts.update"
                  )
                : this.hass.localize(
                    "ui.panel.config.storage.network_mounts.connect"
                  )
            }
          </ha-progress-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  // The device the mount already uses is excluded from candidates, so an empty
  // list is only worth mentioning while creating one.
  private get _showNoCandidates(): boolean {
    return (
      !this._existing &&
      this._data?.type === SupervisorMountType.DISK &&
      this._candidates?.length === 0
    );
  }

  private get _readOnlyForced(): boolean {
    if (this._existing || this._data?.type !== SupervisorMountType.DISK) {
      return false;
    }
    const { device } = this._data;
    return !!this._candidates?.find((candidate) => candidate.device === device)
      ?.read_only;
  }

  // Backup usage is impossible for a read-only mount, whether the device forced
  // that or the user chose it.
  private get _allowBackupUsage(): boolean {
    return !(
      this._data?.type === SupervisorMountType.DISK && this._data.read_only
    );
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
    // A device the host reports as read-only cannot be mounted writable.
    if (this._readOnlyForced) {
      this._data!.read_only = true;
    }
    // Picking such a device while backup was selected leaves a combination
    // Supervisor refuses, so drop the usage and make the user choose again.
    if (!this._allowBackupUsage && this._data?.usage === "backup") {
      delete (this._data as Partial<SupervisorMountRequestParams>).usage;
    }
    this._updateDirtyState(this._data ?? {});
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
    this._markDirtyStateClean();
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
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-mount-view": ViewMountDialog;
  }
}
