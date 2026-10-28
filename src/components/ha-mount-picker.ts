import type { ContextType } from "@lit/context";
import { mdiBackupRestore, mdiFolder, mdiHarddisk, mdiPlayBox } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { consume } from "../common/decorators/consume";
import { fireEvent } from "../common/dom/fire_event";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import {
  apiContext,
  configContext,
  internationalizationContext,
} from "../data/context";
import type { SupervisorMounts } from "../data/supervisor/mounts";
import {
  fetchSupervisorMounts,
  SupervisorMountType,
  SupervisorMountUsage,
  supervisorMountDescription,
} from "../data/supervisor/mounts";
import "./ha-alert";
import "./ha-list-item";
import "./ha-select";
import type { HaSelectOption, HaSelectSelectEvent } from "./ha-select";

const _BACKUP_DATA_DISK_ = "/backup";

@customElement("ha-mount-picker")
class HaMountPicker extends LitElement {
  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property() public usage?: SupervisorMountUsage;

  @state() private _mounts?: SupervisorMounts;

  @state() private _error?: string;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n!: ContextType<typeof internationalizationContext>;

  @consume({ context: configContext, subscribe: true })
  private _config!: ContextType<typeof configContext>;

  @consume({ context: apiContext, subscribe: true })
  private _api!: ContextType<typeof apiContext>;

  protected firstUpdated() {
    this._getMounts();
  }

  protected render() {
    if (this._error) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }
    if (!this._mounts) {
      return nothing;
    }

    const options: HaSelectOption[] = this._filterMounts(
      this._mounts,
      this.usage,
      this._i18n.locale.language
    ).map((mount) => ({
      value: mount.name,
      label: mount.name,
      secondary: supervisorMountDescription(mount),
      iconPath:
        mount.usage === SupervisorMountUsage.MEDIA
          ? mdiPlayBox
          : mount.usage === SupervisorMountUsage.SHARE
            ? mdiFolder
            : mdiBackupRestore,
    }));

    if (this.usage === SupervisorMountUsage.BACKUP) {
      const dataDiskOption = {
        value: _BACKUP_DATA_DISK_,
        iconPath: mdiHarddisk,
        label:
          this._i18n.localize("ui.components.mount-picker.use_datadisk") ||
          "Use data disk for backup",
      };
      if (
        !this._mounts.default_backup_mount ||
        this._mounts.default_backup_mount === _BACKUP_DATA_DISK_
      ) {
        options.unshift(dataDiskOption);
      } else {
        options.push(dataDiskOption);
      }
    }

    return html`
      <ha-select
        .label=${
          this.label === undefined
            ? this._i18n.localize("ui.components.mount-picker.mount")
            : this.label
        }
        .value=${this.value}
        .required=${this.required}
        .disabled=${this.disabled}
        .helper=${this.helper}
        @selected=${this._mountChanged}
        .options=${options}
      >
      </ha-select>
    `;
  }

  private _filterMounts = memoizeOne(
    (mounts: SupervisorMounts, usage: this["usage"], language: string) => {
      let filteredMounts = mounts.mounts.filter((mount) =>
        [
          SupervisorMountType.CIFS,
          SupervisorMountType.DISK,
          SupervisorMountType.NFS,
        ].includes(mount.type)
      );
      if (usage) {
        filteredMounts = filteredMounts.filter(
          (mount) => mount.usage === usage
        );
      }
      return filteredMounts.sort((mountA, mountB) => {
        if (mountA.name === mounts.default_backup_mount) {
          return -1;
        }
        if (mountB.name === mounts.default_backup_mount) {
          return 1;
        }
        return caseInsensitiveStringCompare(mountA.name, mountB.name, language);
      });
    }
  );

  private async _getMounts() {
    try {
      if (isComponentLoaded(this._config.config, "hassio")) {
        this._mounts = await fetchSupervisorMounts(this._api.callWS);
        if (this.usage === SupervisorMountUsage.BACKUP && !this.value) {
          this.value = this._mounts.default_backup_mount || _BACKUP_DATA_DISK_;
        }
      } else {
        this._error = this._i18n.localize(
          "ui.components.mount-picker.error.no_supervisor"
        );
      }
    } catch (_err: any) {
      this._error = this._i18n.localize(
        "ui.components.mount-picker.error.fetch_mounts"
      );
    }
  }

  private _mountChanged(ev: HaSelectSelectEvent) {
    const newValue = ev.detail.value;

    if (newValue !== this.value) {
      this._setValue(newValue);
    }
  }

  private _setValue(value: string) {
    this.value = value;
    setTimeout(() => {
      fireEvent(this, "value-changed", { value });
      fireEvent(this, "change");
    }, 0);
  }

  static get styles(): CSSResultGroup {
    return [
      css`
        ha-select {
          width: 100%;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-mount-picker": HaMountPicker;
  }
}
