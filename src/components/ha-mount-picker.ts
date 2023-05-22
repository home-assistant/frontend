import { mdiBackupRestore, mdiHarddisk, mdiPlayBox } from "@mdi/js";
import { html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { isComponentLoaded } from "../common/config/is_component_loaded";
import { fireEvent } from "../common/dom/fire_event";
import { stopPropagation } from "../common/dom/stop_propagation";
import {
  fetchSupervisorMounts,
  SupervisorMount,
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

  @state() private _mounts?: SupervisorMount[];

  @state() private _error?: string;

  protected firstUpdated() {
    this._getMounts();
  }

  protected render() {
    if (!this._mounts) {
      return nothing;
    }
    if (this._error) {
      return html`<ha-alert alert-type="error">${this._error}</ha-alert>`;
    }
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
        >${this.usage !== SupervisorMountUsage.MEDIA
          ? html`<ha-list-item graphic="icon" .value=${__BACKUP_DATA_DISK__}>
              <span
                >${this.hass.localize(
                  "ui.components.mount-picker.use_datadisk"
                )}</span
              >
              <ha-svg-icon slot="graphic" .path=${mdiHarddisk}></ha-svg-icon>
            </ha-list-item>`
          : ""}
        ${this._filterMounts(this._mounts, this.usage).map(
          (mount) => html`<ha-list-item
            twoline
            graphic="icon"
            .value=${mount.name}
          >
            <span>${mount.name}</span>
            <span slot="secondary"
              >${mount.server}${mount.port
                ? `:${mount.port}`
                : nothing}${mount.type === SupervisorMountType.NFS
                ? mount.path
                : ` :${mount.share}`}</span
            >
            <ha-svg-icon
              slot="graphic"
              .path=${mount.usage === SupervisorMountUsage.MEDIA
                ? mdiPlayBox
                : mdiBackupRestore}
            ></ha-svg-icon>
          </ha-list-item>`
        )}</ha-select
      >
    `;
  }

  private _filterMounts = memoizeOne(
    (mounts: SupervisorMount[], usage: this["usage"]) => {
      if (!usage) {
        return mounts;
      }
      return mounts.filter((mount) => mount.usage === usage);
    }
  );

  private async _getMounts() {
    try {
      if (isComponentLoaded(this.hass, "hassio")) {
        const allMounts = await fetchSupervisorMounts(this.hass);
        this._mounts = allMounts.mounts.filter((mount) =>
          [SupervisorMountType.CIFS, SupervisorMountType.NFS].includes(
            mount.type
          )
        );
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
