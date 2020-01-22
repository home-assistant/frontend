import {
  LitElement,
  property,
  TemplateResult,
  html,
  CSSResult,
  css,
  customElement,
  PropertyValues,
} from "lit-element";
import {
  Marker,
  Map,
  DragEndEvent,
  LatLng,
  Circle,
  MarkerOptions,
  DivIcon,
} from "leaflet";
import {
  setupLeafletMap,
  LeafletModuleType,
} from "../../common/dom/setup-leaflet-map";
import { fireEvent } from "../../common/dom/fire_event";

declare global {
  // for fire event
  interface HASSDomEvents {
    "location-updated": { id: string; location: [number, number] };
    "radius-updated": { id: string; radius: number };
    "marker-clicked": { id: string };
  }
}

export interface Location {
  latitude: number;
  longitude: number;
  radius: number;
  name: string;
  id: string;
  icon: string;
}

@customElement("ha-locations-editor")
export class HaLocationsEditor extends LitElement {
  @property() public locations?: Location[];
  public fitZoom = 16;

  // tslint:disable-next-line
  private Leaflet?: LeafletModuleType;
  // tslint:disable-next-line
  private _leafletMap?: Map;
  private _locationMarkers?: { [key: string]: Marker | Circle };

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
    this._leafletMap.setView(marker.getLatLng(), this.fitZoom);
  }

  protected render(): TemplateResult | void {
    return html`
      <div id="map"></div>
    `;
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
  }

  private get _mapEl(): HTMLDivElement {
    return this.shadowRoot!.querySelector("div")!;
  }

  private async _initMap(): Promise<void> {
    [this._leafletMap, this.Leaflet] = await setupLeafletMap(
      this._mapEl,
      false,
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
    }

    if (!this.locations || !this.locations.length) {
      return;
    }

    this._locationMarkers = {};

    this.locations.forEach((location: Location) => {
      let icon: DivIcon | undefined;
      if (location.icon) {
        // create icon
        let iconHTML = "";
        const el = document.createElement("ha-icon");
        el.setAttribute("icon", location.icon);
        iconHTML = el.outerHTML;

        icon = this.Leaflet!.divIcon({
          html: iconHTML,
          iconSize: [24, 24],
          className: "light leaflet-edit-move",
        });
      }
      if (location.radius) {
        const circle = this.Leaflet!.circle(
          [location.latitude, location.longitude],
          {
            color: "#FF9800",
            radius: location.radius,
          }
        );
        // @ts-ignore
        circle.editing.enable();
        circle.addTo(this._leafletMap!);
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
        resizeMarker.addEventListener(
          "dragend",
          // @ts-ignore
          (ev: DragEndEvent) => this._updateRadius(ev)
        );
        this._locationMarkers![location.id] = circle;
      } else {
        const options: MarkerOptions = {
          draggable: true,
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
          .addTo(this._leafletMap);
        marker.id = location.id;

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
      .leaflet-edit-move {
        cursor: move !important;
      }
      .leaflet-edit-resize {
        border-radius: 50%;
        cursor: nesw-resize !important;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-locations-editor": HaLocationsEditor;
  }
}
