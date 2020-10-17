import {
  Circle,
  DivIcon,
  DragEndEvent,
  LatLng,
  LeafletMouseEvent,
  Map,
  Marker,
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
import { nextRender } from "../../common/util/render-status";
import { defaultRadiusColor } from "../../data/zone";
import { HomeAssistant } from "../../types";

@customElement("ha-location-editor")
class LocationEditor extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ type: Array }) public location?: [number, number];

  @property({ type: Number }) public radius?: number;

  @property() public radiusColor?: string;

  @property() public icon?: string;

  @property({ type: Boolean }) public darkMode?: boolean;

  public fitZoom = 16;

  private _iconEl?: DivIcon;

  private _ignoreFitToMap?: [number, number];

  // eslint-disable-next-line
  private Leaflet?: LeafletModuleType;

  private _leafletMap?: Map;

  private _tileLayer?: TileLayer;

  private _locationMarker?: Marker | Circle;

  public fitMap(): void {
    if (!this._leafletMap || !this.location) {
      return;
    }
    if (this._locationMarker && "getBounds" in this._locationMarker) {
      this._leafletMap.fitBounds(this._locationMarker.getBounds());
    } else {
      this._leafletMap.setView(this.location, this.fitZoom);
    }
    this._ignoreFitToMap = this.location;
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

    if (changedProps.has("location")) {
      this._updateMarker();
      if (
        this.location &&
        (!this._ignoreFitToMap ||
          this._ignoreFitToMap[0] !== this.location[0] ||
          this._ignoreFitToMap[1] !== this.location[1])
      ) {
        this.fitMap();
      }
    }
    if (changedProps.has("radius")) {
      this._updateRadius();
    }
    if (changedProps.has("radiusColor")) {
      this._updateRadiusColor();
    }
    if (changedProps.has("icon")) {
      this._updateIcon();
    }

    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
      if (!oldHass || oldHass.themes?.darkMode === this.hass.themes?.darkMode) {
        return;
      }
      if (!this._leafletMap || !this._tileLayer) {
        return;
      }
      this._tileLayer = replaceTileLayer(
        this.Leaflet,
        this._leafletMap,
        this._tileLayer,
        this.hass.themes?.darkMode
      );
    }
  }

  private get _mapEl(): HTMLDivElement {
    return this.shadowRoot!.querySelector("div")!;
  }

  private async _initMap(): Promise<void> {
    [this._leafletMap, this.Leaflet, this._tileLayer] = await setupLeafletMap(
      this._mapEl,
      this.darkMode ?? this.hass.themes?.darkMode,
      Boolean(this.radius)
    );
    this._leafletMap.addEventListener(
      "click",
      // @ts-ignore
      (ev: LeafletMouseEvent) => this._locationUpdated(ev.latlng)
    );
    this._updateIcon();
    this._updateMarker();
    this.fitMap();
    this._leafletMap.invalidateSize();
  }

  private _locationUpdated(latlng: LatLng) {
    let longitude = latlng.lng;
    if (Math.abs(longitude) > 180.0) {
      // Normalize longitude if map provides values beyond -180 to +180 degrees.
      longitude = (((longitude % 360.0) + 540.0) % 360.0) - 180.0;
    }
    this.location = this._ignoreFitToMap = [latlng.lat, longitude];
    fireEvent(this, "change", undefined, { bubbles: false });
  }

  private _radiusUpdated() {
    this._ignoreFitToMap = this.location;
    this.radius = (this._locationMarker as Circle).getRadius();
    fireEvent(this, "change", undefined, { bubbles: false });
  }

  private _updateIcon() {
    if (!this.icon) {
      this._iconEl = undefined;
      return;
    }

    // create icon
    let iconHTML = "";
    const el = document.createElement("ha-icon");
    el.setAttribute("icon", this.icon);
    iconHTML = el.outerHTML;

    this._iconEl = this.Leaflet!.divIcon({
      html: iconHTML,
      iconSize: [24, 24],
      className: "light leaflet-edit-move",
    });
    this._setIcon();
  }

  private _setIcon() {
    if (!this._locationMarker || !this._iconEl) {
      return;
    }

    if (!this.radius) {
      (this._locationMarker as Marker).setIcon(this._iconEl);
      return;
    }

    // @ts-ignore
    const moveMarker = this._locationMarker.editing._moveMarker;
    moveMarker.setIcon(this._iconEl);
  }

  private _setupEdit() {
    // @ts-ignore
    this._locationMarker.editing.enable();
    // @ts-ignore
    const moveMarker = this._locationMarker.editing._moveMarker;
    // @ts-ignore
    const resizeMarker = this._locationMarker.editing._resizeMarkers[0];
    this._setIcon();
    moveMarker.addEventListener(
      "dragend",
      // @ts-ignore
      (ev: DragEndEvent) => this._locationUpdated(ev.target.getLatLng())
    );
    resizeMarker.addEventListener(
      "dragend",
      // @ts-ignore
      (ev: DragEndEvent) => this._radiusUpdated(ev)
    );
  }

  private async _updateMarker(): Promise<void> {
    if (!this.location) {
      if (this._locationMarker) {
        this._locationMarker.remove();
        this._locationMarker = undefined;
      }
      return;
    }

    if (this._locationMarker) {
      this._locationMarker.setLatLng(this.location);
      if (this.radius) {
        // @ts-ignore
        this._locationMarker.editing.disable();
        await nextRender();
        this._setupEdit();
      }
      return;
    }

    if (!this.radius) {
      this._locationMarker = this.Leaflet!.marker(this.location, {
        draggable: true,
      });
      this._setIcon();
      this._locationMarker.addEventListener(
        "dragend",
        // @ts-ignore
        (ev: DragEndEvent) => this._locationUpdated(ev.target.getLatLng())
      );
      this._leafletMap!.addLayer(this._locationMarker);
    } else {
      this._locationMarker = this.Leaflet!.circle(this.location, {
        color: this.radiusColor || defaultRadiusColor,
        radius: this.radius,
      });
      this._leafletMap!.addLayer(this._locationMarker);
      this._setupEdit();
    }
  }

  private _updateRadius(): void {
    if (!this._locationMarker || !this.radius) {
      return;
    }
    (this._locationMarker as Circle).setRadius(this.radius);
  }

  private _updateRadiusColor(): void {
    if (!this._locationMarker || !this.radius) {
      return;
    }
    (this._locationMarker as Circle).setStyle({ color: this.radiusColor });
  }

  static get styles(): CSSResult {
    return css`
      :host {
        display: block;
        height: 300px;
      }
      #map {
        height: 100%;
        background: inherit;
      }
      .leaflet-edit-move {
        border-radius: 50%;
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
    "ha-location-editor": LocationEditor;
  }
}
