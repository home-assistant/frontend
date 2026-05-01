import { mdiCogOutline, mdiTextureBox } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../../../../common/dom/fire_event";

import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-icon";
import "../../../../components/ha-spinner";
import "../../../../components/ha-svg-icon";
import type { AreaRegistryEntry } from "../../../../data/area/area_registry";
import {
  getExtendedEntityRegistryEntry,
  type ExtEntityRegistryEntry,
} from "../../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../../types";
import { showVacuumSegmentMappingView } from "./show-view-vacuum-segment-mapping";

@customElement("ha-more-info-view-vacuum-clean-areas")
export class HaMoreInfoViewVacuumCleanAreas extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public params!: { entityId: string };

  @state() private _mappedAreaIds?: string[];

  @state() private _selectedAreaIds: string[] = [];

  @state() private _loading = true;

  @state() private _error?: string;

  @state() private _submitting = false;

  protected firstUpdated() {
    this._loadAreas();
  }

  private async _loadAreas() {
    if (!this.params.entityId) return;
    this._loading = true;
    this._error = undefined;

    try {
      const entry: ExtEntityRegistryEntry =
        await getExtendedEntityRegistryEntry(this.hass, this.params.entityId);

      const areaMapping = entry?.options?.vacuum?.area_mapping || {};
      this._mappedAreaIds = Object.keys(areaMapping).filter(
        (areaId) => this.hass.areas[areaId]
      );
    } catch (err: any) {
      this._error = err.message || "Failed to load areas";
    } finally {
      this._loading = false;
    }
  }

  private _toggleArea(ev: Event) {
    const areaId = (ev.currentTarget as HTMLElement).dataset.areaId!;
    const index = this._selectedAreaIds.indexOf(areaId);
    if (index >= 0) {
      this._selectedAreaIds = this._selectedAreaIds.filter(
        (id) => id !== areaId
      );
    } else {
      this._selectedAreaIds = [...this._selectedAreaIds, areaId];
    }
  }

  private async _startCleaning() {
    if (!this.params.entityId || this._selectedAreaIds.length === 0) return;
    this._submitting = true;

    try {
      await this.hass.callService("vacuum", "clean_area", {
        entity_id: this.params.entityId,
        cleaning_area_id: this._selectedAreaIds,
      });
      this._selectedAreaIds = [];
      fireEvent(this, "close-child-view");
    } catch (err: any) {
      this._error = err.message || "Failed to start cleaning";
    } finally {
      this._submitting = false;
    }
  }

  private _openSegmentMapping() {
    showVacuumSegmentMappingView(
      this,
      this.hass.localize,
      this.params.entityId
    );
  }

  private _renderAreaCard(areaId: string) {
    const area: AreaRegistryEntry | undefined = this.hass.areas[areaId];
    if (!area) return nothing;

    const selectionIndex = this._selectedAreaIds.indexOf(areaId);
    const isSelected = selectionIndex >= 0;

    return html`
      <div
        class="area-card ${isSelected ? "selected" : ""}"
        data-area-id=${areaId}
        @click=${this._toggleArea}
      >
        ${isSelected
          ? html`<span class="badge">${selectionIndex + 1}</span>`
          : nothing}
        <div class="area-icon">
          ${area.icon
            ? html`<ha-icon .icon=${area.icon}></ha-icon>`
            : html`<ha-svg-icon .path=${mdiTextureBox}></ha-svg-icon>`}
        </div>
        <div class="area-name">${area.name}</div>
      </div>
    `;
  }

  protected render() {
    if (this._loading) {
      return html`
        <div class="center">
          <ha-spinner></ha-spinner>
        </div>
      `;
    }

    if (this._error) {
      return html`
        <div class="content">
          <ha-alert alert-type="error">${this._error}</ha-alert>
        </div>
      `;
    }

    if (!this._mappedAreaIds || this._mappedAreaIds.length === 0) {
      return html`
        <div class="content empty-content">
          <div class="empty">
            <ha-svg-icon .path=${mdiTextureBox}></ha-svg-icon>
            <p class="empty-title">
              ${this.hass.localize(
                "ui.dialogs.more_info_control.vacuum.no_areas_header"
              )}
            </p>
            <p>
              ${this.hass.localize(
                this.hass.user?.is_admin
                  ? "ui.dialogs.more_info_control.vacuum.no_areas_text"
                  : "ui.dialogs.more_info_control.vacuum.no_areas_text_non_admin"
              )}
            </p>
            ${this.hass.user?.is_admin
              ? html`
                  <ha-button
                    appearance="plain"
                    size="small"
                    @click=${this._openSegmentMapping}
                  >
                    <ha-svg-icon
                      slot="start"
                      .path=${mdiCogOutline}
                    ></ha-svg-icon>
                    ${this.hass.localize(
                      "ui.dialogs.more_info_control.vacuum.configure"
                    )}
                  </ha-button>
                `
              : nothing}
          </div>
        </div>
      `;
    }

    return html`
      <div class="content">
        <div class="area-grid">
          ${this._mappedAreaIds.map((areaId) => this._renderAreaCard(areaId))}
        </div>
        <p class="hint">
          ${this.hass.localize(
            "ui.dialogs.more_info_control.vacuum.clean_areas_order_hint"
          )}
        </p>
      </div>

      <div class="footer">
        <ha-button
          @click=${this._startCleaning}
          .disabled=${this._selectedAreaIds.length === 0 || this._submitting}
        >
          ${this.hass.localize(
            "ui.dialogs.more_info_control.vacuum.start_cleaning_areas"
          )}
          ${this._selectedAreaIds.length > 0
            ? ` (${this._selectedAreaIds.length})`
            : nothing}
        </ha-button>
      </div>
    `;
  }

  static styles: CSSResultGroup = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    .center {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--ha-space-8);
    }

    .content {
      flex: 1;
      overflow-y: auto;
      padding: var(--ha-space-4);
    }

    .empty-content {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty {
      --mdc-icon-size: 48px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      color: var(--secondary-text-color);
      padding: var(--ha-space-8) var(--ha-space-4);
      max-width: 420px;
    }

    .empty ha-button {
      --mdc-icon-size: 18px;
    }

    .empty .empty-title {
      font-size: var(--ha-font-size-l);
      font-weight: var(--ha-font-weight-medium);
      color: var(--primary-text-color);
      margin: var(--ha-space-3) 0 var(--ha-space-2);
    }

    .empty p {
      margin: 0 0 var(--ha-space-4);
    }

    .area-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: var(--ha-space-3);
    }

    .area-card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--ha-space-2);
      padding: 12px;
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color);
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      overflow: hidden;
      min-height: 80px;
      color: var(--primary-text-color);
    }

    .area-card::before {
      content: "";
      display: block;
      inset: 0;
      position: absolute;
      background-color: transparent;
      pointer-events: none;
      opacity: 0.2;
      transition:
        background-color 180ms ease-in-out,
        opacity 180ms ease-in-out;
    }

    .area-card:hover::before {
      background-color: var(--divider-color);
    }

    .area-card.selected::before {
      background-color: var(--primary-color);
    }

    .area-card .badge {
      position: absolute;
      top: 6px;
      inset-inline-end: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background-color: var(--primary-color);
      color: var(--text-primary-color);
      font-size: var(--ha-font-size-xs);
      font-weight: var(--ha-font-weight-medium);
      z-index: 1;
    }

    .area-icon {
      --mdc-icon-size: 28px;
      color: var(--secondary-text-color);
    }

    .area-card.selected .area-icon {
      color: var(--primary-color);
    }

    .area-name {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: var(--ha-space-8);
      font-size: var(--ha-font-size-m);
      font-weight: var(--ha-font-weight-normal);
      text-align: center;
      line-height: var(--ha-line-height-condensed);
      word-break: break-word;
    }

    .hint {
      margin: var(--ha-space-3) 0 0;
      text-align: center;
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      padding: var(--ha-space-4);
      border-top: 1px solid var(--divider-color);
      background: var(
        --ha-dialog-surface-background,
        var(--mdc-theme-surface, #fff)
      );
      position: sticky;
      bottom: 0;
      z-index: 10;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-more-info-view-vacuum-clean-areas": HaMoreInfoViewVacuumCleanAreas;
  }
}
