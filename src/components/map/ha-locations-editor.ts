import { consume } from "@lit/context";
import type { PropertyValues, TemplateResult } from "lit";
import { css, html, LitElement } from "lit";
import { customElement, property, query, state } from "lit/decorators";
import memoizeOne from "memoize-one";
import { fireEvent } from "../../common/dom/fire_event";
import type { HASSDomEvent } from "../../common/dom/fire_event";
import { MAP_MAX_ZOOM } from "../../common/map/base-layer";
import type { MapLatLng } from "../../common/map/map-engine";
import { circleBoundsPoints } from "../../common/map/map-engine";
import { internationalizationContext } from "../../data/context";
import type { HomeAssistantInternationalization, ThemeMode } from "../../types";
import "../ha-input-helper-text";
import "./ha-map";
import type { HaMap, HaMapEditableLocation } from "./ha-map";
import type { HaIcon } from "../ha-icon";
import type { HaSvgIcon } from "../ha-svg-icon";

declare global {
  // for fire event
  interface HASSDomEvents {
    "location-updated": { id: string; location: [number, number] };
    "markers-updated": undefined;
    "radius-updated": { id: string; radius: number };
    "marker-clicked": { id: string };
  }
}

export interface MarkerLocation {
  latitude: number;
  longitude: number;
  radius?: number;
  name?: string;
  id: string;
  icon?: string;
  iconPath?: string;
  radius_color?: string;
  location_editable?: boolean;
  radius_editable?: boolean;
}

const ICON_SIZE = 24;

/**
 * A map with draggable markers and zone circles, drawn by ha-map. Without
 * editing support (the Leaflet fallback) they are static, with a notice.
 */
@customElement("ha-locations-editor")
export class HaLocationsEditor extends LitElement {
  @property({ attribute: false }) public locations?: MarkerLocation[];

  @property() public helper?: string;

  @property({ attribute: "auto-fit", type: Boolean }) public autoFit = false;

  @property({ type: Number }) public zoom = 16;

  @property({ attribute: "theme-mode", type: String })
  public themeMode: ThemeMode = "auto";

  @property({ type: Boolean, attribute: "pin-on-click" })
  public pinOnClick = false;

  @query("ha-map", true) private map!: HaMap;

  @state() private _editingAvailable = true;

  @state()
  @consume({ context: internationalizationContext, subscribe: true })
  private _i18n?: HomeAssistantInternationalization;

  public fitMap(options?: { zoom?: number; pad?: number }): void {
    this.map.fitMap(options);
  }

  public fitBounds(
    boundingbox: MapLatLng[],
    options?: { zoom?: number; pad?: number }
  ) {
    this.map.fitBounds(boundingbox, options);
  }

  public async fitMarker(
    id: string,
    options?: { zoom?: number }
  ): Promise<void> {
    await this.updateComplete;
    const location = this.locations?.find((loc) => loc.id === id);
    if (!location) {
      return;
    }
    const center: MapLatLng = [location.latitude, location.longitude];
    if (location.radius) {
      // Only the map's maximum caps the zoom, however small the zone
      this.map.fitBounds(circleBoundsPoints(center, location.radius), {
        pad: 0,
        zoom: MAP_MAX_ZOOM,
      });
    } else {
      this.map.setView(center, options?.zoom || this.zoom);
    }
  }

  protected render(): TemplateResult {
    return html`
      <ha-map
        .editableLocations=${this._editableLocations(this.locations)}
        .zoom=${this.zoom}
        .autoFit=${this.autoFit}
        .themeMode=${this.themeMode}
        .clickable=${this.pinOnClick}
        @map-clicked=${this._mapClicked}
        @editable-location-moved=${this._locationMoved}
        @editable-location-resized=${this._radiusChanged}
        @editable-location-clicked=${this._markerClicked}
        @editing-available-changed=${this._editingAvailableChanged}
      ></ha-map>
      ${
        !this._editingAvailable &&
        this._i18n &&
        this.locations?.some(
          (location) => location.location_editable || location.radius_editable
        )
          ? html`<ha-input-helper-text
              >${this._i18n.localize(
                "ui.components.map.editing_unavailable"
              )}</ha-input-helper-text
            >`
          : ""
      }
      ${
        this.helper
          ? html`<ha-input-helper-text>${this.helper}</ha-input-helper-text>`
          : ""
      }
    `;
  }

  private _editableLocations = memoizeOne(
    (locations?: MarkerLocation[]): HaMapEditableLocation[] => {
      const ids = new Set((locations ?? []).map((location) => location.id));
      for (const id of this._elements.keys()) {
        if (!ids.has(id)) {
          this._elements.delete(id);
        }
      }
      return (locations ?? []).map((location) => ({
        id: location.id,
        location: [location.latitude, location.longitude],
        radius: location.radius,
        element: this._elementFor(location),
        elementSize: [ICON_SIZE, ICON_SIZE],
        title: location.name,
        color: location.radius_color,
        locationEditable: location.location_editable,
        radiusEditable: location.radius_editable,
      }));
    }
  );

  // Reused while unchanged, so ha-map moves markers instead of rebuilding them
  private _elements = new Map<string, { key: string; element?: HTMLElement }>();

  private _elementFor(location: MarkerLocation): HTMLElement | undefined {
    const key = JSON.stringify([
      location.icon,
      location.iconPath,
      location.name,
      location.location_editable,
    ]);
    const cached = this._elements.get(location.id);
    if (cached?.key === key) {
      return cached.element;
    }
    const element = this._createIcon(location);
    this._elements.set(location.id, { key, element });
    return element;
  }

  private _createIcon(location: MarkerLocation): HTMLElement | undefined {
    if (!location.icon && !location.iconPath) {
      return undefined;
    }
    const el = document.createElement("div");
    el.className = `named-icon ${
      location.location_editable ? "draggable" : ""
    }`;
    if (location.name !== undefined) {
      el.innerText = location.name;
    }
    let iconEl: HaIcon | HaSvgIcon;
    if (location.icon) {
      iconEl = document.createElement("ha-icon");
      iconEl.setAttribute("icon", location.icon);
    } else {
      iconEl = document.createElement("ha-svg-icon");
      iconEl.setAttribute("path", location.iconPath!);
    }
    el.prepend(iconEl);
    return el;
  }

  public updated(changedProps: PropertyValues): void {
    if (changedProps.has("locations")) {
      fireEvent(this, "markers-updated");

      // Follow a location that was edited out of view
      const oldLocations = changedProps.get("locations") as
        MarkerLocation[] | undefined;
      const movedLocations = this.locations?.filter(
        (loc, idx) =>
          !oldLocations?.[idx] ||
          ((loc.latitude !== oldLocations[idx].latitude ||
            loc.longitude !== oldLocations[idx].longitude) &&
            this.map.containsLocation([
              oldLocations[idx].latitude,
              oldLocations[idx].longitude,
            ]) &&
            !this.map.containsLocation([loc.latitude, loc.longitude]))
      );
      if (movedLocations?.length === 1) {
        this.map.panTo([
          movedLocations[0].latitude,
          movedLocations[0].longitude,
        ]);
      }
    }
  }

  private _editingAvailableChanged(ev: HASSDomEvent<{ available: boolean }>) {
    this._editingAvailable = ev.detail.available;
  }

  private _normalizeLongitude(longitude: number): number {
    if (Math.abs(longitude) > 180.0) {
      // Normalize longitude if map provides values beyond -180 to +180 degrees.
      return (((longitude % 360.0) + 540.0) % 360.0) - 180.0;
    }
    return longitude;
  }

  private _locationMoved(
    ev: HASSDomEvent<{ id: string; location: MapLatLng }>
  ) {
    const [latitude, longitude] = ev.detail.location;
    fireEvent(
      this,
      "location-updated",
      {
        id: ev.detail.id,
        location: [latitude, this._normalizeLongitude(longitude)],
      },
      { bubbles: false }
    );
  }

  private _radiusChanged(ev: HASSDomEvent<{ id: string; radius: number }>) {
    fireEvent(
      this,
      "radius-updated",
      { id: ev.detail.id, radius: ev.detail.radius },
      { bubbles: false }
    );
  }

  private _markerClicked(ev: HASSDomEvent<{ id: string }>) {
    fireEvent(this, "marker-clicked", { id: ev.detail.id }, { bubbles: false });
  }

  private _mapClicked(ev: HASSDomEvent<{ location: [number, number] }>) {
    if (this.pinOnClick && this.locations?.length) {
      const id = this.locations[0].id;
      const location: [number, number] = [
        ev.detail.location[0],
        this._normalizeLongitude(ev.detail.location[1]),
      ];
      fireEvent(this, "location-updated", { id, location }, { bubbles: false });

      // If the normalized longitude wraps around the globe, pan to the new location.
      if (location[1] !== ev.detail.location[1]) {
        this.map.panTo(location);
      }
    }
  }

  static styles = css`
    ha-map {
      display: block;
      height: 100%;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-locations-editor": HaLocationsEditor;
  }
}
