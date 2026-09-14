import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiArrowRightThin, mdiDelete } from "@mdi/js";
import { fireEvent } from "../common/dom/fire_event";
import { computeAreaName } from "../common/entity/compute_area_name";
import type { Segment } from "../data/vacuum";
import { getVacuumSegments } from "../data/vacuum";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-alert";
import "./ha-area-picker";
import "./ha-icon-button";
import "./ha-svg-icon";

type AreaSegmentMapping = Record<string, string[]>; // area ID -> segment IDs

@customElement("ha-vacuum-segment-area-mapper")
export class HaVacuumSegmentAreaMapper extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: "entity-id" }) public entityId!: string;

  @property({ attribute: false }) public value?: AreaSegmentMapping;

  @state() private _segments?: Segment[];

  @state() private _loading = false;

  @state() private _error?: string;

  public get lastSeenSegments() {
    return this._segments;
  }

  protected willUpdate(changedProps: PropertyValues<this>): void {
    super.willUpdate(changedProps);

    if (changedProps.has("entityId") && this.entityId) {
      this._loadSegments();
    }
  }

  private async _loadSegments() {
    this._loading = true;
    this._error = undefined;

    try {
      const result = await getVacuumSegments(this.hass, this.entityId);
      this._segments = result.segments;
    } catch (err: any) {
      this._error = err.message || "Failed to load segments";
      this._segments = undefined;
    } finally {
      this._loading = false;
    }
  }

  protected render() {
    if (this._loading) {
      return html`
        <div class="loading">${this.hass.localize("ui.common.loading")}...</div>
      `;
    }

    if (this._error) {
      return html` <ha-alert alert-type="error">${this._error}</ha-alert> `;
    }

    if (!this._segments || this._segments.length === 0) {
      return html`
        <ha-alert alert-type="info">
          ${this.hass.localize("ui.dialogs.vacuum_segment_mapping.no_segments")}
        </ha-alert>
      `;
    }

    // Group segments by group (if available)
    const groupedSegments = this._groupSegments(this._segments);

    const orphanedAreas = this._getOrphanedAreas();

    return html`
      ${Object.entries(groupedSegments).map(
        ([groupName, segments]) => html`
          ${groupName ? html`<h2>${groupName}</h2>` : nothing}
          ${segments.map((segment) => this._renderSegment(segment))}
        `
      )}
      ${orphanedAreas.length ? this._renderOrphanedAreas(orphanedAreas) : nothing}
    `;
  }

  private _getOrphanedAreas(): string[] {
    if (!this.value || !this._segments || this._segments.length === 0) {
      return [];
    }
    const liveIds = new Set(this._segments.map((segment) => segment.id));
    return Object.entries(this.value)
      .filter(([, segmentIds]) => segmentIds.some((id) => !liveIds.has(id)))
      .map(([areaId]) => areaId);
  }

  private _renderOrphanedAreas(areaIds: string[]) {
    return html`
      <h2>
        ${this.hass.localize(
          "ui.dialogs.vacuum_segment_mapping.orphaned_header"
        )}
      </h2>
      <p class="orphaned-description">
        ${this.hass.localize(
          "ui.dialogs.vacuum_segment_mapping.orphaned_description"
        )}
      </p>
      ${areaIds.map((areaId) => {
        const area = this.hass.areas[areaId];
        const name = (area ? computeAreaName(area) : undefined) || areaId;
        return html`
          <div class="orphaned-row">
            <span class="orphaned-name">${name}</span>
            <ha-icon-button
              .path=${mdiDelete}
              .label=${this.hass.localize(
                "ui.dialogs.vacuum_segment_mapping.orphaned_remove"
              )}
              data-area-id=${areaId}
              @click=${this._removeOrphanedArea}
            ></ha-icon-button>
          </div>
        `;
      })}
    `;
  }

  private _removeOrphanedArea = (ev: Event) => {
    const areaId = (ev.currentTarget as HTMLElement).dataset.areaId;
    if (!areaId || !this.value || !this._segments) {
      return;
    }
    const liveIds = new Set(this._segments.map((segment) => segment.id));
    const newMapping: AreaSegmentMapping = { ...this.value };
    const kept = (newMapping[areaId] ?? []).filter((id) => liveIds.has(id));
    if (kept.length) {
      newMapping[areaId] = kept;
    } else {
      delete newMapping[areaId];
    }
    fireEvent(this, "value-changed", { value: newMapping });
  };

  private _groupSegments(segments: Segment[]): Record<string, Segment[]> {
    const grouped: Record<string, Segment[]> = {};

    for (const segment of segments) {
      const group = segment.group || "";
      if (!grouped[group]) {
        grouped[group] = [];
      }
      grouped[group].push(segment);
    }

    return grouped;
  }

  private _renderSegment(segment: Segment) {
    const mappedAreas = this._getSegmentAreas(segment.id);

    return html`
      <div class="segment-row">
        <span class="segment-name">${segment.name}</span>
        <ha-svg-icon class="arrow" .path=${mdiArrowRightThin}></ha-svg-icon>
        <ha-area-picker
          .value=${mappedAreas}
          .label=${this.hass.localize(
            "ui.dialogs.vacuum_segment_mapping.area_label"
          )}
          @value-changed=${this._handleAreaChanged}
          data-segment-id=${segment.id}
        ></ha-area-picker>
      </div>
    `;
  }

  private _handleAreaChanged = (ev: CustomEvent) => {
    const target = ev.currentTarget as HTMLElement;
    const segmentId = target.dataset.segmentId;
    if (segmentId) {
      this._areaChanged(segmentId, ev);
    }
  };

  private _getSegmentAreas(segmentId: string): string | undefined {
    if (!this.value) {
      return undefined;
    }

    // Find which area(s) contain this segment
    for (const [areaId, segmentIds] of Object.entries(this.value)) {
      if (segmentIds.includes(segmentId)) {
        return areaId;
      }
    }

    return undefined;
  }

  private _areaChanged(segmentId: string, ev: CustomEvent) {
    ev.stopPropagation();
    const newAreaId = ev.detail.value as string | undefined;

    // Create a copy of the current mapping
    const newMapping: AreaSegmentMapping = { ...this.value };

    // Remove segment from all areas
    for (const areaId of Object.keys(newMapping)) {
      newMapping[areaId] = newMapping[areaId].filter((id) => id !== segmentId);
      // Remove empty area entries
      if (newMapping[areaId].length === 0) {
        delete newMapping[areaId];
      }
    }

    // Add segment to new area if specified
    if (newAreaId) {
      if (!newMapping[newAreaId]) {
        newMapping[newAreaId] = [];
      }
      newMapping[newAreaId].push(segmentId);
    }

    fireEvent(this, "value-changed", { value: newMapping });
  }

  static styles: CSSResultGroup = [
    haStyle,
    css`
      :host {
        display: block;
      }

      .segment-row {
        display: flex;
        align-items: center;
        gap: var(--ha-space-4);
        padding: var(--ha-space-2) var(--ha-space-4);
      }

      .segment-name {
        flex: 1;
        font: var(--ha-font-body-l);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .arrow {
        flex-shrink: 0;
        color: var(--secondary-text-color);
      }

      @media (max-width: 600px) {
        .arrow {
          display: none;
        }
      }

      ha-area-picker {
        flex: 2;
        min-width: 0;
        max-width: 300px;
      }

      h2 {
        margin: var(--ha-space-4) var(--ha-space-4) var(--ha-space-2);
        font-size: var(--ha-font-size-m);
        font-weight: var(--ha-font-weight-bold);
        line-height: var(--ha-line-height-normal);
        color: var(--primary-text-color);
      }

      .orphaned-description {
        margin: var(--ha-space-1) var(--ha-space-4) var(--ha-space-2);
        color: var(--secondary-text-color);
        font: var(--ha-font-body-s);
      }

      .orphaned-row {
        display: flex;
        align-items: center;
        gap: var(--ha-space-4);
        padding: var(--ha-space-2) var(--ha-space-2) var(--ha-space-2)
          var(--ha-space-4);
      }

      .orphaned-name {
        flex: 1;
        font: var(--ha-font-body-l);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .loading {
        padding: var(--ha-space-4);
        text-align: center;
        color: var(--secondary-text-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-vacuum-segment-area-mapper": HaVacuumSegmentAreaMapper;
  }
}
