import { mdiBackupRestore, mdiFolder, mdiHarddisk, mdiPlayBox } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import { caseInsensitiveStringCompare } from "../common/string/compare";
import {
  fetchSupervisorMounts,
  SupervisorMounts,
  SupervisorMountType,
  SupervisorMountUsage,
} from "../data/supervisor/mounts";
import { HomeAssistant } from "../types";
import "./ha-alert";
import "./ha-list-item";
import "./ha-select";
import type { HaSelect } from "./ha-select";

const __BACKUP_DATA_DISK__ = "/backup";

@customElement("ha-mount-picker")
class HaMountPicker extends LitElement {
  public hass!: HomeAssistant;

  @property() public label?: string;

  @property() public value?: string;

  @property() public helper?: string;

  @property({ type: Boolean }) public disabled = false;

  @property({ type: Boolean }) public required = false;

  @property() public usage?: SupervisorMountUsage;

  @state() private _mounts?: SupervisorMounts;

  @state() private _error?: string;

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
    const dataDiskOption = html`<ha-list-item
      graphic="icon"
      .value=${__BACKUP_DATA_DISK__}
    >
      <span>
        ${this.hass.localize("ui.components.mount-picker.use_datadisk") ||
        "Use data disk for backup"}
      </span>
      <ha-svg-icon slot="graphic" .path=${mdiHarddisk}></ha-svg-icon>
    </ha-list-item>`;
    return html`
      <ha-select
        .label=${this.label === undefined && this.hass
          ? this.hass.localize("ui.components.mount-picker.mount")
          : this.label}
        .value=${this._value}
        .required=${this.required}
        .disabled=${this.disabled}
        .helper=${this.helper}
        @selected=${this._mountChanged}
        @closed=${stopPropagation}
        fixedMenuPosition
        naturalMenuWidth
      >
        ${this.usage === SupervisorMountUsage.BACKUP &&
        (!this._mounts.default_backup_mount ||
          this._mounts.default_backup_mount === __BACKUP_DATA_DISK__)
          ? dataDiskOption
          : nothing}
        ${this._filterMounts(this._mounts, this.usage).map(
          (mount) =>
            html`<ha-list-item twoline graphic="icon" .value=${mount.name}>
              <span>${mount.name}</span>
              <span slot="secondary"
                >${mount.server}${mount.port
                  ? `:${mount.port}`
                  : nothing}${mount.type === SupervisorMountType.NFS
                  ? mount.path
                  : `:${mount.share}`}</span
              >
              <ha-svg-icon
                slot="graphic"
                .path=${mount.usage === SupervisorMountUsage.MEDIA
                  ? mdiPlayBox
                  : mount.usage === SupervisorMountUsage.SHARE
                  ? mdiFolder
                  : mdiBackupRestore}
              ></ha-svg-icon>
            </ha-list-item>`
        )}
        ${this.usage === SupervisorMountUsage.BACKUP &&
        this._mounts.default_backup_mount
          ? dataDiskOption
          : nothing}
      </ha-select>
    `;
  }

  private _filterMounts = memoizeOne(
    (mounts: SupervisorMounts, usage: this["usage"]) => {
      let filteredMounts = mounts.mounts.filter((mount) =>
        [SupervisorMountType.CIFS, SupervisorMountType.NFS].includes(mount.type)
      );
      if (usage) {
        filteredMounts = mounts.mounts.filter((mount) => mount.usage === usage);
      }
      return filteredMounts.sort((mountA, mountB) => {
        if (mountA.name === mounts.default_backup_mount) {
          return -1;
        }
        if (mountB.name === mounts.default_backup_mount) {
          return 1;
        }
        return caseInsensitiveStringCompare(
          mountA.name,
          mountB.name,
          this.hass.locale.language
        );
      });
    }
  );

  private async _getMounts() {
    try {
      if (isComponentLoaded(this.hass, "hassio")) {
        this._mounts = await fetchSupervisorMounts(this.hass);
        if (this.usage === SupervisorMountUsage.BACKUP && !this.value) {
          this.value =
            this._mounts.default_backup_mount || __BACKUP_DATA_DISK__;
        }
      } else {
        this._error = this.hass.localize(
          "ui.components.mount-picker.error.no_supervisor"
        );
      }
    } catch (err: any) {
      this._error = this.hass.localize(
        "ui.components.mount-picker.error.fetch_mounts"
      );
    }
  }

  private get _value() {
    return this.value || "";
  }

  private _mountChanged(ev: Event) {
    ev.stopPropagation();
    const target = ev.target as HaSelect;
    const newValue = target.value;

    if (newValue !== this._value) {
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
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-mount-picker": HaMountPicker;
  }
}
