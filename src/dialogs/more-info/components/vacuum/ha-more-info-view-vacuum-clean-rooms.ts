import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import "../../../../components/ha-alert";
import "../../../../components/ha-button";
import "../../../../components/ha-check-list-item";
import "../../../../components/ha-spinner";
import type { Segment } from "../../../../data/vacuum";
import { getVacuumSegments } from "../../../../data/vacuum";
import {
  getExtendedEntityRegistryEntry,
  type ExtEntityRegistryEntry,
} from "../../../../data/entity/entity_registry";
import type { HomeAssistant } from "../../../../types";

interface DisplaySegment extends Segment {
  areaName?: string;
}

@customElement("ha-more-info-view-vacuum-clean-rooms")
export class HaMoreInfoViewVacuumCleanRooms extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public params!: { entityId: string };

  @state() private _segments?: DisplaySegment[];

  @state() private _selectedSegmentIds = new Set<string>();

  @state() private _loading = true;

  @state() private _error?: string;

  @state() private _submitting = false;

  protected firstUpdated() {
    this._loadSegments();
  }

  private async _loadSegments() {
    if (!this.params.entityId) return;
    this._loading = true;
    this._error = undefined;

    try {
      const [segmentsResult, entry] = await Promise.all([
        getVacuumSegments(this.hass, this.params.entityId),
        getExtendedEntityRegistryEntry(this.hass, this.params.entityId).catch(
          () => undefined as ExtEntityRegistryEntry | undefined
        ),
      ]);

      const areaMapping = entry?.options?.vacuum?.area_mapping || {};

      // Build reverse mapping: segment ID -> area ID
      const segmentToArea: Record<string, string> = {};
      for (const [areaId, segmentIds] of Object.entries(areaMapping)) {
        for (const segId of segmentIds) {
          segmentToArea[segId] = areaId;
        }
      }

      this._segments = segmentsResult.segments.map((seg) => {
        const areaId = segmentToArea[seg.id];
        const area = areaId ? this.hass.areas[areaId] : undefined;
        return {
          ...seg,
          areaName: area?.name,
        };
      });
    } catch (err: any) {
      this._error = err.message || "Failed to load rooms";
    } finally {
      this._loading = false;
    }
  }

  private _toggleSegment(ev: Event) {
    const segmentId = (ev.currentTarget as HTMLElement).dataset.segmentId!;
    const selected = new Set(this._selectedSegmentIds);
    if (selected.has(segmentId)) {
      selected.delete(segmentId);
    } else {
      selected.add(segmentId);
    }
    this._selectedSegmentIds = selected;
  }

  private _selectAll() {
    if (!this._segments) return;
    this._selectedSegmentIds = new Set(this._segments.map((s) => s.id));
  }

  private _deselectAll() {
    this._selectedSegmentIds = new Set();
  }

  private async _startCleaning() {
    if (!this.params.entityId || this._selectedSegmentIds.size === 0) return;
    this._submitting = true;

    try {
      await this.hass.callService("vacuum", "clean_area", {
        entity_id: this.params.entityId,
        area: [...this._selectedSegmentIds],
      });
    } catch (err: any) {
      this._error = err.message || "Failed to start cleaning";
    } finally {
      this._submitting = false;
    }
  }

  private _groupSegments(
    segments: DisplaySegment[]
  ): Map<string, DisplaySegment[]> {
    const groups = new Map<string, DisplaySegment[]>();
    for (const seg of segments) {
      const group = seg.group || "";
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(seg);
    }
    return groups;
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

    if (!this._segments || this._segments.length === 0) {
      return html`
        <div class="content">
          <p class="empty">
            ${this.hass.localize(
              "ui.dialogs.more_info_control.vacuum.no_rooms_available"
            )}
          </p>
        </div>
      `;
    }

    const allSelected = this._selectedSegmentIds.size === this._segments.length;
    const groups = this._groupSegments(this._segments);

    return html`
      <div class="content">
        <div class="select-actions">
          <ha-button
            @click=${allSelected ? this._deselectAll : this._selectAll}
          >
            ${allSelected
              ? this.hass.localize(
                  "ui.components.subpage-data-table.select_none"
                )
              : this.hass.localize(
                  "ui.components.subpage-data-table.select_all"
                )}
          </ha-button>
        </div>

        <div class="segments-list">
          ${[...groups.entries()].map(([groupName, segments]) => {
            const showGroupHeader = groupName && groups.size > 1;
            return html`
              ${showGroupHeader
                ? html`<div class="group-header">${groupName}</div>`
                : nothing}
              ${segments.map(
                (segment) => html`
                  <ha-check-list-item
                    left
                    .selected=${this._selectedSegmentIds.has(segment.id)}
                    data-segment-id=${segment.id}
                    @request-selected=${this._toggleSegment}
                  >
                    <span class="segment-name">
                      ${segment.areaName || segment.name}
                    </span>
                    ${segment.areaName && segment.areaName !== segment.name
                      ? html`<span class="segment-original"
                          >${segment.name}</span
                        >`
                      : nothing}
                  </ha-check-list-item>
                `
              )}
            `;
          })}
        </div>
      </div>

      <div class="footer">
        <ha-button
          @click=${this._startCleaning}
          .disabled=${this._selectedSegmentIds.size === 0 || this._submitting}
        >
          ${this.hass.localize(
            "ui.dialogs.more_info_control.vacuum.start_cleaning_rooms"
          )}
          ${this._selectedSegmentIds.size > 0
            ? ` (${this._selectedSegmentIds.size})`
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
    }

    .empty {
      text-align: center;
      color: var(--secondary-text-color);
      padding: var(--ha-space-8);
    }

    .select-actions {
      display: flex;
      justify-content: flex-end;
      padding: var(--ha-space-2) var(--ha-space-4);
    }

    .segments-list {
      padding: 0 var(--ha-space-2);
    }

    .group-header {
      font-weight: var(--ha-font-weight-medium);
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: var(--ha-space-4) var(--ha-space-4) var(--ha-space-1);
    }

    ha-check-list-item {
      --mdc-theme-secondary: var(--primary-color);
    }

    .segment-name {
      font-size: var(--ha-font-size-m);
    }

    .segment-original {
      font-size: var(--ha-font-size-s);
      color: var(--secondary-text-color);
      margin-inline-start: var(--ha-space-2);
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
    "ha-more-info-view-vacuum-clean-rooms": HaMoreInfoViewVacuumCleanRooms;
  }
}
