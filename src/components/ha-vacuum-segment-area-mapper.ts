import "@material/mwc-list/mwc-list-item";
import type { CSSResultGroup, PropertyValues } from "lit";
import { LitElement, css, html, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { fireEvent } from "../common/dom/fire_event";
import type { Segment } from "../data/vacuum";
import { getVacuumSegments } from "../data/vacuum";
import type { HomeAssistant } from "../types";
import "./ha-alert";
import "./ha-area-picker";

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
    return this._segments?.map((seg: Segment) => ({
      id: seg.id,
      name: seg.name,
      ...(seg.group && { group: seg.group }),
    }));
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
        <ha-alert alert-type="info"> No segments available </ha-alert>
      `;
    }

    // Group segments by group (if available)
    const groupedSegments = this._groupSegments(this._segments);

    return html`
      <div class="segments">
        ${Object.entries(groupedSegments).map(
          ([groupName, segments]) => html`
            ${groupName !== "undefined"
              ? html`<div class="group-header">${groupName}</div>`
              : nothing}
            ${segments.map((segment) => this._renderSegment(segment))}
          `
        )}
      </div>
    `;
  }

  private _groupSegments(segments: Segment[]): Record<string, Segment[]> {
    const grouped: Record<string, Segment[]> = {};

    for (const segment of segments) {
      const group = segment.group || "undefined";
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
        <div class="segment-info">
          <div class="segment-name">${segment.name}</div>
          <div class="segment-id">${segment.id}</div>
        </div>
        <ha-area-picker
          .hass=${this.hass}
          .value=${mappedAreas}
          .label=${"Area"}
          allow-custom-entity
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

  static styles: CSSResultGroup = css`
    :host {
      display: block;
    }

    .loading {
      padding: var(--ha-space-4);
      text-align: center;
      color: var(--secondary-text-color);
    }

    .segments {
      display: flex;
      flex-direction: column;
      gap: var(--ha-space-2);
    }

    .group-header {
      font-weight: 500;
      color: var(--primary-text-color);
      padding: var(--ha-space-3) var(--ha-space-2);
      margin-top: var(--ha-space-2);
      background-color: var(--secondary-background-color);
      border-radius: var(--ha-card-border-radius, 12px);
    }

    .segment-row {
      display: flex;
      align-items: center;
      gap: var(--ha-space-4);
      padding: var(--ha-space-2);
      border-radius: var(--ha-card-border-radius, 12px);
      background-color: var(--card-background-color);
      border: 1px solid var(--divider-color);
    }

    .segment-info {
      flex: 1;
      min-width: 0;
    }

    .segment-name {
      font-weight: 500;
      color: var(--primary-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .segment-id {
      font-size: 0.875rem;
      color: var(--secondary-text-color);
      font-family: var(--ha-font-family-code);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    ha-area-picker {
      flex: 1;
      min-width: 200px;
    }

    @media (max-width: 600px) {
      .segment-row {
        flex-direction: column;
        align-items: stretch;
      }

      ha-area-picker {
        min-width: 0;
      }
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-vacuum-segment-area-mapper": HaVacuumSegmentAreaMapper;
  }
}
