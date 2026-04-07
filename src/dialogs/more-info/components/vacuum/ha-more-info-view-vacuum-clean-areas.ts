import { mdiCheckCircle, mdiCogOutline, mdiTextureBox } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
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

  @state() private _selectedAreaIds = new Set<string>();

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
      const entry: ExtEntityRegistryEntry | undefined =
        await getExtendedEntityRegistryEntry(
          this.hass,
          this.params.entityId
        ).catch(() => undefined);

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
    const selected = new Set(this._selectedAreaIds);
    if (selected.has(areaId)) {
      selected.delete(areaId);
    } else {
      selected.add(areaId);
    }
    this._selectedAreaIds = selected;
  }

  private async _startCleaning() {
    if (!this.params.entityId || this._selectedAreaIds.size === 0) return;
    this._submitting = true;

    try {
      await this.hass.callService("vacuum", "clean_area", {
        entity_id: this.params.entityId,
        cleaning_area_id: [...this._selectedAreaIds],
      });
      this._selectedAreaIds = new Set();
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

    const isSelected = this._selectedAreaIds.has(areaId);

    return html`
      <div
        class="area-card ${classMap({ selected: isSelected })}"
        data-area-id=${areaId}
        @click=${this._toggleArea}
      >
        ${isSelected
          ? html`<ha-svg-icon
              class="check"
              .path=${mdiCheckCircle}
            ></ha-svg-icon>`
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
          <ha-spinner active></ha-spinner>
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
            <h1>
              ${this.hass.localize(
                "ui.dialogs.more_info_control.vacuum.no_areas_header"
              )}
            </h1>
            <p>
              ${this.hass.localize(
                "ui.dialogs.more_info_control.vacuum.no_areas_text"
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
      </div>

      <div class="footer">
        <ha-button
          @click=${this._startCleaning}
          .disabled=${this._selectedAreaIds.size === 0 || this._submitting}
        >
          ${this.hass.localize(
            "ui.dialogs.more_info_control.vacuum.start_cleaning_areas"
          )}
          ${this._selectedAreaIds.size > 0
            ? ` (${this._selectedAreaIds.size})`
            : ""}
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

    .empty h1 {
      font-size: var(--ha-font-size-xl);
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
      padding: var(--ha-space-3) var(--ha-space-2);
      border-radius: var(--ha-card-border-radius, var(--ha-border-radius-lg));
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color);
      cursor: pointer;
      user-select: none;
      -webkit-user-select: none;
      -webkit-tap-highlight-color: transparent;
      overflow: hidden;
      transition: border-color 180ms ease-in-out;
      min-height: 80px;
    }

    .area-card::before {
      content: "";
      position: absolute;
      inset: 0;
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

    .area-card.selected {
      border-color: var(--primary-color);
    }

    .area-card.selected::before {
      background-color: var(--primary-color);
    }

    .area-card .check {
      position: absolute;
      top: 6px;
      inset-inline-end: 6px;
      color: var(--primary-color);
      --mdc-icon-size: 18px;
    }

    .area-icon {
      --mdc-icon-size: 28px;
      color: var(--secondary-text-color);
      margin: var(--ha-space-2) 0;
    }

    .area-card.selected .area-icon {
      color: var(--primary-color);
    }

    .area-name {
      display: flex;
      height: var(--ha-space-8);
      align-items: center;
      font-size: var(--ha-font-size-s);
      text-align: center;
      line-height: var(--ha-line-height-condensed);
      word-break: break-word;
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
