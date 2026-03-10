import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { mdiArrowRightThin } from "@mdi/js";
import { fireEvent } from "../common/dom/fire_event";
import type { Segment } from "../data/vacuum";
import { getVacuumSegments } from "../data/vacuum";
import { haStyle } from "../resources/styles";
import type { HomeAssistant } from "../types";
import "./ha-alert";
import "./ha-area-picker";
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

  protected willUpdate(changedProps: PropertyValues): void {
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

    return html`
      ${Object.entries(groupedSegments).map(
        ([groupName, segments]) => html`
          ${groupName ? html`<h2>${groupName}</h2>` : nothing}
          ${segments.map((segment) => this._renderSegment(segment))}
        `
      )}
    `;
  }

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
          .hass=${this.hass}
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
        margin: 0;
        margin-inline-start: var(--ha-space-4);
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
