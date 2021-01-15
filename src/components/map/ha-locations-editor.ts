import {
  Circle,
  DivIcon,
  DragEndEvent,
  LatLng,
  Map,
  Marker,
  MarkerOptions,
  TileLayer,
} from "leaflet";
import {
  css,
  CSSResult,
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  TemplateResult,
} from "lit-element";
import { fireEvent } from "../../common/dom/fire_event";
import {
  LeafletModuleType,
  replaceTileLayer,
  setupLeafletMap,
} from "../../common/dom/setup-leaflet-map";
import { defaultRadiusColor } from "../../data/zone";
import { HomeAssistant } from "../../types";

declare global {
  // for fire event
  interface HASSDomEvents {
    "location-updated": { id: string; location: [number, number] };
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
  radius_color?: string;
  location_editable?: boolean;
  radius_editable?: boolean;
}

@customElement("ha-locations-editor")
export class HaLocationsEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property() public locations?: MarkerLocation[];

  public fitZoom = 16;

  // eslint-disable-next-line
  private Leaflet?: LeafletModuleType;

  // eslint-disable-next-line
  private _leafletMap?: Map;

  private _tileLayer?: TileLayer;

  private _locationMarkers?: { [key: string]: Marker | Circle };

  private _circles: Record<string, Circle> = {};

  public fitMap(): void {
    if (
      !this._leafletMap ||
      !this._locationMarkers ||
      !Object.keys(this._locationMarkers).length
    ) {
      return;
    }
    const bounds = this.Leaflet!.latLngBounds(
      Object.values(this._locationMarkers).map((item) => item.getLatLng())
    );
    this._leafletMap.fitBounds(bounds.pad(0.5));
  }

  public fitMarker(id: string): void {
    if (!this._leafletMap || !this._locationMarkers) {
      return;
    }
    const marker = this._locationMarkers[id];
    if (!marker) {
      return;
    }
    if ("getBounds" in marker) {
      this._leafletMap.fitBounds(marker.getBounds());
      (marker as Circle).bringToFront();
    } else {
      const circle = this._circles[id];
      if (circle) {
        this._leafletMap.fitBounds(circle.getBounds());
      } else {
        this._leafletMap.setView(marker.getLatLng(), this.fitZoom);
      }
    }
  }

  protected render(): TemplateResult {
    return html` <div id="map"></div> `;
  }

  protected firstUpdated(changedProps: PropertyValues): void {
    super.firstUpdated(changedProps);
    this._initMap();
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);

    // Still loading.
    if (!this.Leaflet) {
      return;
    }

    if (changedProps.has("locations")) {
      this._updateMarkers();
    }

    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!oldHass || oldHass.themes.darkMode === this.hass.themes.darkMode) {
        return;
      }
      if (!this._leafletMap || !this._tileLayer) {
        return;
      }
      this._tileLayer = replaceTileLayer(
        this.Leaflet,
        this._leafletMap,
        this._tileLayer,
        this.hass.themes.darkMode
      );
    }
  }

  private get _mapEl(): HTMLDivElement {
    return this.shadowRoot!.querySelector("div")!;
  }

  private async _initMap(): Promise<void> {
    [this._leafletMap, this.Leaflet, this._tileLayer] = await setupLeafletMap(
      this._mapEl,
      this.hass.themes.darkMode,
      true
    );
    this._updateMarkers();
    this.fitMap();
    this._leafletMap.invalidateSize();
  }

  private _updateLocation(ev: DragEndEvent) {
    const marker = ev.target;
    const latlng: LatLng = marker.getLatLng();
    let longitude: number = latlng.lng;
    if (Math.abs(longitude) > 180.0) {
      // Normalize longitude if map provides values beyond -180 to +180 degrees.
      longitude = (((longitude % 360.0) + 540.0) % 360.0) - 180.0;
    }
    const location: [number, number] = [latlng.lat, longitude];
    fireEvent(
      this,
      "location-updated",
      { id: marker.id, location },
      { bubbles: false }
    );
  }

  private _updateRadius(ev: DragEndEvent) {
    const marker = ev.target;
    const circle = this._locationMarkers![marker.id] as Circle;
    fireEvent(
      this,
      "radius-updated",
      { id: marker.id, radius: circle.getRadius() },
      { bubbles: false }
    );
  }

  private _markerClicked(ev: DragEndEvent) {
    const marker = ev.target;
    fireEvent(this, "marker-clicked", { id: marker.id }, { bubbles: false });
  }

  private _updateMarkers(): void {
    if (this._locationMarkers) {
      Object.values(this._locationMarkers).forEach((marker) => {
        marker.remove();
      });
      this._locationMarkers = undefined;

      Object.values(this._circles).forEach((circle) => circle.remove());
      this._circles = {};
    }

    if (!this.locations || !this.locations.length) {
      return;
    }

    this._locationMarkers = {};

    this.locations.forEach((location: MarkerLocation) => {
      let icon: DivIcon | undefined;
      if (location.icon) {
        // create icon
        const el = document.createElement("div");
        el.className = "named-icon";
        if (location.name) {
          el.innerText = location.name;
        }
        const iconEl = document.createElement("ha-icon");
        iconEl.setAttribute("icon", location.icon);
        el.prepend(iconEl);

        icon = this.Leaflet!.divIcon({
          html: el.outerHTML,
          iconSize: [24, 24],
          className: "light",
        });
      }
      if (location.radius) {
        const circle = this.Leaflet!.circle(
          [location.latitude, location.longitude],
          {
            color: location.radius_color || defaultRadiusColor,
            radius: location.radius,
          }
        );
        circle.addTo(this._leafletMap!);
        if (location.radius_editable || location.location_editable) {
          // @ts-ignore
          circle.editing.enable();
          // @ts-ignore
          const moveMarker = circle.editing._moveMarker;
          // @ts-ignore
          const resizeMarker = circle.editing._resizeMarkers[0];
          if (icon) {
            moveMarker.setIcon(icon);
          }
          resizeMarker.id = moveMarker.id = location.id;
          moveMarker
            .addEventListener(
              "dragend",
              // @ts-ignore
              (ev: DragEndEvent) => this._updateLocation(ev)
            )
            .addEventListener(
              "click",
              // @ts-ignore
              (ev: MouseEvent) => this._markerClicked(ev)
            );
          if (location.radius_editable) {
            resizeMarker.addEventListener(
              "dragend",
              // @ts-ignore
              (ev: DragEndEvent) => this._updateRadius(ev)
            );
          } else {
            resizeMarker.remove();
          }
          this._locationMarkers![location.id] = circle;
        } else {
          this._circles[location.id] = circle;
        }
      }
      if (
        !location.radius ||
        (!location.radius_editable && !location.location_editable)
      ) {
        const options: MarkerOptions = {
          title: location.name,
        };

        if (icon) {
          options.icon = icon;
        }

        const marker = this.Leaflet!.marker(
          [location.latitude, location.longitude],
          options
        )
          .addEventListener(
            "dragend",
            // @ts-ignore
            (ev: DragEndEvent) => this._updateLocation(ev)
          )
          .addEventListener(
            "click",
            // @ts-ignore
            (ev: MouseEvent) => this._markerClicked(ev)
          )
          .addTo(this._leafletMap!);
        (marker as any).id = location.id;

        this._locationMarkers![location.id] = marker;
      }
    });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        height: 300px;
      }
      #map {
        height: 100%;
      }
      .leaflet-marker-draggable {
        cursor: move !important;
      }
      .leaflet-edit-resize {
        border-radius: 50%;
        cursor: nesw-resize !important;
      }
      .named-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        text-align: center;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-locations-editor": HaLocationsEditor;
  }
}
