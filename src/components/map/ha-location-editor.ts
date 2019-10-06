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
import { Marker, Map, LeafletMouseEvent, DragEndEvent, LatLng } from "leaflet";
import {
  setupLeafletMap,
  LeafletModuleType,
} from "../../common/dom/setup-leaflet-map";
import { fireEvent } from "../../common/dom/fire_event";

@customElement("ha-location-editor")
class LocationEditor extends LitElement {
  @property() public location?: [number, number];
  public fitZoom = 16;

  private _ignoreFitToMap?: [number, number];

  // tslint:disable-next-line
  private Leaflet?: LeafletModuleType;
  private _leafletMap?: Map;
  private _locationMarker?: Marker;

  public fitMap(): void {
    if (!this._leafletMap || !this.location) {
      return;
    }
    this._leafletMap.setView(this.location, this.fitZoom);
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

    this._updateMarker();
    if (!this._ignoreFitToMap || this._ignoreFitToMap !== this.location) {
      this.fitMap();
    }
    this._ignoreFitToMap = undefined;
  }

  private get _mapEl(): HTMLDivElement {
    return this.shadowRoot!.querySelector("div")!;
  }

  private async _initMap(): Promise<void> {
    [this._leafletMap, this.Leaflet] = await setupLeafletMap(this._mapEl);
    this._leafletMap.addEventListener(
      "click",
      // @ts-ignore
      (ev: LeafletMouseEvent) => this._updateLocation(ev.latlng)
    );
    this._updateMarker();
    this.fitMap();
    this._leafletMap.invalidateSize();
  }

  private _updateLocation(latlng: LatLng) {
    let longitude = latlng.lng;
    if (Math.abs(longitude) > 180.0) {
      // Normalize longitude if map provides values beyond -180 to +180 degrees.
      longitude = (((longitude % 360.0) + 540.0) % 360.0) - 180.0;
    }
    this.location = this._ignoreFitToMap = [latlng.lat, longitude];
    fireEvent(this, "change", undefined, { bubbles: false });
  }

  private _updateMarker(): void {
    if (!this.location) {
      if (this._locationMarker) {
        this._locationMarker.remove();
        this._locationMarker = undefined;
      }
      return;
    }

    if (this._locationMarker) {
      this._locationMarker.setLatLng(this.location);
      return;
    }
    this._locationMarker = this.Leaflet!.marker(this.location, {
      draggable: true,
    });
    this._locationMarker.addEventListener(
      "dragend",
      // @ts-ignore
      (ev: DragEndEvent) => this._updateLocation(ev.target.getLatLng())
    );
    this._leafletMap!.addLayer(this._locationMarker);
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-location-editor": LocationEditor;
  }
}
