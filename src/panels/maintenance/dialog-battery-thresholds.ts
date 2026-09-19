import { mdiRestore } from "@mdi/js";
import { css, html, LitElement, nothing } from "lit";
import { customElement, state } from "lit/decorators";
import { computeDomain } from "../../common/entity/compute_domain";
import {
  findEntities,
  generateEntityFilter,
} from "../../common/entity/entity_filter";
import "../../components/ha-alert";
import "../../components/ha-button";
import "../../components/ha-dialog";
import "../../components/ha-dialog-footer";
import "../../components/ha-icon-button";
import "../../components/ha-spinner";
import "../../components/input/ha-input";
import {
  fetchMaintenanceData,
  saveMaintenanceData,
} from "../../data/battery-thresholds";
import { DialogMixin } from "../../dialogs/dialog-mixin";
import { showConfirmationDialog } from "../../dialogs/generic/show-dialog-box";
import type { BatteryThresholdsDialogParams } from "./show-dialog-battery-thresholds";
import {
  batteryThresholdKey,
  LOW_BATTERY_THRESHOLD,
  maintenanceEntityFilters,
} from "./strategies/maintenance-view-strategy";

// An empty field starts its arrows from the default, not from 0
const minFor = (value: string, fallback: string) =>
  value === "" ? fallback : "0";

// Keeps the typed value within 0-100 and returns it
const clampInput = (ev: Event) => {
  const el = ev.currentTarget as HTMLInputElement;
  const n = Number(el.value);
  if (el.value !== "" && n < 0) {
    el.value = "0";
  } else if (n > 100) {
    el.value = "100";
  }
  return el.value;
};

@customElement("dialog-battery-thresholds")
class DialogBatteryThresholds extends DialogMixin<BatteryThresholdsDialogParams>(
  LitElement
) {
  @state() private _groups?: { name: string; ids: string[] }[];

  @state() private _global = "";

  // threshold key (device or entity id) -> typed value
  @state() private _overrides: Record<string, string> = {};

  @state() private _error?: string;

  @state() private _saving = false;

  private _baseline?: string;

  public connectedCallback() {
    super.connectedCallback();
    this._load();
  }

  private async _load() {
    const { hass } = this.params!;
    try {
      const data = await fetchMaintenanceData(hass.connection);
      const filters = maintenanceEntityFilters.map((f) =>
        generateEntityFilter(hass, f)
      );
      const byArea = new Map<string | undefined, string[]>();
      const seen = new Set<string>();
      for (const id of findEntities(Object.keys(hass.states), filters)) {
        const key = batteryThresholdKey(hass, id);
        // One row per device, even if it exposes several battery sensors
        if (computeDomain(id) !== "sensor" || seen.has(key)) {
          continue;
        }
        seen.add(key);
        const entity = hass.entities[id];
        const areaId =
          entity?.area_id ||
          (entity?.device_id
            ? hass.devices[entity.device_id]?.area_id
            : undefined) ||
          undefined;
        byArea.set(areaId, [...(byArea.get(areaId) ?? []), id]);
      }
      this._groups = [...byArea]
        .map(([areaId, ids]) => ({
          name: areaId
            ? (hass.areas[areaId]?.name ?? areaId)
            : hass.localize(
                "ui.panel.lovelace.strategy.maintenance.other_devices"
              ),
          ids,
          unassigned: !areaId,
        }))
        .sort(
          (a, b) =>
            Number(a.unassigned) - Number(b.unassigned) ||
            a.name.localeCompare(b.name)
        );
      this._global = data.battery_threshold?.toString() ?? "";
      this._overrides = Object.fromEntries(
        Object.entries(data.battery_thresholds ?? {}).map(([key, v]) => [
          key,
          String(v),
        ])
      );
      this._baseline = this._snapshot();
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
    }
  }

  // Empty overrides are the same as missing ones
  private _snapshot() {
    return JSON.stringify([
      this._global.trim(),
      Object.entries(this._overrides)
        .filter(([, v]) => v !== "")
        .sort(([a], [b]) => a.localeCompare(b)),
    ]);
  }

  private get _dirty() {
    return this._baseline !== undefined && this._snapshot() !== this._baseline;
  }

  protected render() {
    if (!this.params) {
      return nothing;
    }
    const { hass } = this.params;
    return html`
      <ha-dialog
        open
        .headerTitle=${hass.localize(
          "ui.panel.lovelace.strategy.maintenance.battery_thresholds"
        )}
        .preventScrimClose=${this._saving || this._dirty}
        @closed=${this.closeDialog}
      >
        ${
          this._error
            ? html`<ha-alert alert-type="error">${this._error}</ha-alert>`
            : nothing
        }
        ${
          this._groups
            ? this._renderForm()
            : this._error
              ? nothing
              : html`<ha-spinner></ha-spinner>`
        }
        <ha-dialog-footer slot="footer">
          <ha-button
            appearance="plain"
            slot="secondaryAction"
            ?disabled=${this._saving}
            @click=${this._cancel}
          >
            ${hass.localize("ui.common.cancel")}
          </ha-button>
          <ha-button
            slot="primaryAction"
            ?disabled=${!this._groups || this._saving}
            @click=${this._save}
          >
            ${hass.localize("ui.common.save")}
          </ha-button>
        </ha-dialog-footer>
      </ha-dialog>
    `;
  }

  private _renderForm() {
    const { hass } = this.params!;
    return html`
      <ha-input
        autofocus
        type="number"
        min=${minFor(this._global, String(LOW_BATTERY_THRESHOLD))}
        max="100"
        step="1"
        .label=${hass.localize(
          "ui.panel.lovelace.strategy.maintenance.default_threshold"
        )}
        .placeholder=${String(LOW_BATTERY_THRESHOLD)}
        .value=${this._global}
        @input=${this._globalChanged}
      ></ha-input>
      ${this._groups!.map(
        (group) => html`
          <h3>${group.name}</h3>
          ${group.ids.map((id) => this._renderRow(id))}
        `
      )}
    `;
  }

  private _renderRow(id: string) {
    const { hass } = this.params!;
    const key = batteryThresholdKey(hass, id);
    const value = this._overrides[key] ?? "";
    const deviceId = hass.entities[id]?.device_id;
    const device = deviceId ? hass.devices[deviceId] : undefined;
    const name =
      device?.name_by_user ||
      device?.name ||
      hass.states[id]?.attributes.friendly_name ||
      id;
    return html`
      <div class="row">
        <ha-input
          type="number"
          min=${minFor(value, this._global || String(LOW_BATTERY_THRESHOLD))}
          max="100"
          step="1"
          data-key=${key}
          .label=${name}
          .placeholder=${this._global || String(LOW_BATTERY_THRESHOLD)}
          .value=${value}
          @input=${this._overrideChanged}
        ></ha-input>
        <ha-icon-button
          .path=${mdiRestore}
          .label=${hass.localize(
            "ui.panel.lovelace.strategy.maintenance.reset_threshold",
            { name }
          )}
          data-key=${key}
          ?disabled=${value === ""}
          @click=${this._resetOverride}
        ></ha-icon-button>
      </div>
    `;
  }

  private _globalChanged(ev: Event) {
    this._global = clampInput(ev);
  }

  private _overrideChanged(ev: Event) {
    const key = (ev.currentTarget as HTMLElement).dataset.key!;
    this._overrides = { ...this._overrides, [key]: clampInput(ev) };
  }

  private _resetOverride(ev: Event) {
    const key = (ev.currentTarget as HTMLElement).dataset.key!;
    this._overrides = { ...this._overrides, [key]: "" };
  }

  private async _cancel() {
    if (this._dirty) {
      const { hass } = this.params!;
      const discard = await showConfirmationDialog(this, {
        title: hass.localize(
          "ui.panel.lovelace.strategy.maintenance.discard_title"
        ),
        text: hass.localize(
          "ui.panel.lovelace.strategy.maintenance.discard_text"
        ),
        destructive: true,
      });
      if (!discard) {
        return;
      }
    }
    this.closeDialog();
  }

  private async _save() {
    this._saving = true;
    this._error = undefined;
    const parse = (v: string) =>
      v.trim() === "" || isNaN(Number(v))
        ? undefined
        : Math.min(100, Math.max(0, Number(v)));
    const battery_thresholds = Object.fromEntries(
      Object.entries(this._overrides).flatMap(([key, v]) => {
        const n = parse(v);
        return n === undefined ? [] : [[key, n]];
      })
    );
    try {
      await saveMaintenanceData(this.params!.hass.connection, {
        battery_threshold: parse(this._global),
        battery_thresholds,
      });
      this.closeDialog();
    } catch (err) {
      this._error = err instanceof Error ? err.message : String(err);
      this._saving = false;
    }
  }

  static styles = css`
    h3 {
      margin: 16px 0 0;
      font-size: var(--ha-font-size-m, 14px);
      color: var(--secondary-text-color);
    }
    .row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .row ha-input {
      flex: 1;
    }
    ha-input {
      display: block;
      margin-top: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "dialog-battery-thresholds": DialogBatteryThresholds;
  }
}
