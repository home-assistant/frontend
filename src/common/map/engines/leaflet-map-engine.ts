import type {
  CircleMarker,
  Control,
  Map,
  MarkerClusterGroup,
  Polyline,
} from "leaflet";
import type { LeafletModuleType } from "../../dom/setup-leaflet-map";
import type { MapBaseLayer } from "../base-layer";
import { createBaseLayer, MAP_MAX_ZOOM, MAP_MIN_ZOOM } from "../base-layer";
import { DecoratedMarker } from "../decorated_marker";
import { isTouch } from "../../../util/is_touch";
import type {
  MapClusterOptions,
  MapCircleOptions,
  MapControlPosition,
  MapEngine,
  MapEngineOptions,
  MapFitOptions,
  MapItemHandle,
  MapLatLng,
  MapMarkerHandle,
  MapMarkerOptions,
  MapPath,
} from "../map-engine";
import { setMarkerAccessibility } from "../marker-accessibility";

/** A leaflet marker that knows the engine handle it was created for */
interface HandledMarker extends DecoratedMarker {
  engineHandle?: LeafletMarkerHandle;
}

interface LeafletMarkerHandle extends MapMarkerHandle {
  marker: HandledMarker;
}

/**
 * The Leaflet implementation of MapEngine. Renders vector tiles through the
 * maplibre-gl-leaflet adapter when WebGL2 is available and raster tiles
 * otherwise (see createBaseLayer), so it is both the non-WebGL2 fallback and
 * the engine ha-locations-editor requires for leaflet-draw.
 */
export class LeafletMapEngine implements MapEngine {
  /**
   * Escape hatch for ha-locations-editor, which manages its own Leaflet
   * layers (leaflet-draw). Not for use anywhere else.
   */
  public leafletMap?: Map;

  public Leaflet?: LeafletModuleType;

  private _baseLayer?: MapBaseLayer;

  private _clusterable: HandledMarker[] = [];

  private _cluster?: MarkerClusterGroup;

  private _clusterOptions: MapClusterOptions | null = null;

  private _scaleControl?: Control.Scale;

  public async init(
    container: HTMLElement,
    options: MapEngineOptions
  ): Promise<void> {
    const root = container.parentNode;
    if (!root) {
      throw new Error("Cannot set up a Leaflet map on a detached element");
    }
    // eslint-disable-next-line
    const Leaflet = (await import("leaflet")).default as LeafletModuleType;
    Leaflet.Icon.Default.imagePath = "/static/images/leaflet/images/";
    await import("leaflet.markercluster");

    const map = Leaflet.map(container, {
      minZoom: MAP_MIN_ZOOM,
      maxZoom: MAP_MAX_ZOOM,
    });
    map.attributionControl.setPrefix("");
    for (const href of [
      "/static/images/leaflet/leaflet.css",
      "/static/images/leaflet/MarkerCluster.css",
    ]) {
      const style = document.createElement("link");
      style.setAttribute("href", href);
      style.setAttribute("rel", "stylesheet");
      root.appendChild(style);
    }
    map.setView(options.center, options.zoom);

    // The base layer adds itself; a vector layer may still fall back to raster
    this._baseLayer = await createBaseLayer(
      Leaflet,
      map,
      options.darkMode,
      options.token,
      options.rasterOnly ?? false
    );
    this.leafletMap = map;
    this.Leaflet = Leaflet;
    map.zoomControl?.setPosition(options.zoomControlPosition);

    const { events } = options;
    if (events.click) {
      map.on("click", (ev) => {
        events.click!([ev.latlng.lat, ev.latlng.lng]);
      });
    }
    if (events.zoomStart) {
      map.on("zoomstart", () => events.zoomStart!());
    }
    if (events.moveStart) {
      map.on("movestart", () => events.moveStart!());
    }
  }

  public destroy(): void {
    this.leafletMap?.remove();
    this.leafletMap = undefined;
    this.Leaflet = undefined;
    this._baseLayer = undefined;
    this._cluster = undefined;
    this._clusterable = [];
    this._scaleControl = undefined;
  }

  public invalidateSize(): void {
    this.leafletMap?.invalidateSize({ debounceMoveend: true });
  }

  public hasUsableSize(): boolean {
    if (!this.leafletMap) {
      return false;
    }
    const size = this.leafletMap.getSize();
    if (size.x > 0 && size.y > 0) {
      return true;
    }
    const container = this.leafletMap.getContainer();
    if (container.clientWidth > 0 && container.clientHeight > 0) {
      // The container was laid out since Leaflet last measured it
      this.leafletMap.invalidateSize(false);
      return true;
    }
    return false;
  }

  public setDarkMode(darkMode: boolean): void {
    this._baseLayer?.setDarkMode(darkMode);
  }

  public setZoomControlPosition(position: MapControlPosition): void {
    this.leafletMap?.zoomControl?.setPosition(position);
  }

  public setScaleRuler(options: { metric: boolean } | null): void {
    if (this._scaleControl) {
      this.leafletMap?.removeControl(this._scaleControl);
      this._scaleControl = undefined;
    }
    if (!options || !this.leafletMap || !this.Leaflet) {
      return;
    }
    this._scaleControl = this.Leaflet.control.scale({
      position: "bottomleft",
      metric: options.metric,
      imperial: !options.metric,
    });
    this._scaleControl.addTo(this.leafletMap!);
  }

  public setView(center: MapLatLng, zoom?: number): void {
    this.leafletMap?.setView(center, zoom);
  }

  public setZoom(zoom: number): void {
    this.leafletMap?.setZoom(zoom);
  }

  private _getZoom(): number {
    return this.leafletMap?.getZoom() ?? 0;
  }

  private _project(location: MapLatLng): { x: number; y: number } {
    const point = this.leafletMap!.project(location, this._getZoom());
    return { x: point.x, y: point.y };
  }

  public fitBounds(points: MapLatLng[], options?: MapFitOptions): void {
    if (!this.leafletMap || !this.Leaflet || !points.length) {
      return;
    }
    const bounds = this.Leaflet.latLngBounds(points).pad(options?.pad ?? 0.5);
    this.leafletMap.fitBounds(bounds, {
      maxZoom: options?.maxZoom,
      animate: options?.animate,
    });
  }

  public addMarker(
    element: HTMLElement,
    location: MapLatLng,
    options: MapMarkerOptions
  ): MapMarkerHandle {
    const decoration = options.decoration
      ? this.Leaflet!.circle(location, {
          interactive: false,
          color: options.decoration.color,
          radius: options.decoration.radius,
        })
      : undefined;

    // Leaflet's keyboard support focuses its own wrapper, where the element's
    // activation handlers never hear a key; the element itself takes focus
    const interactive = options.interactive ?? true;
    if (interactive) {
      element.tabIndex = 0;
    }
    setMarkerAccessibility(element, options.title, interactive);
    const marker: HandledMarker = new DecoratedMarker(location, decoration, {
      icon: this.Leaflet!.divIcon({
        html: element,
        iconSize: options.size,
        iconAnchor: options.anchor,
        className: "",
      }),
      interactive,
      keyboard: false,
      title: options.title,
    });

    const handle: LeafletMarkerHandle = {
      marker,
      location,
      clusterData: options.clusterData,
      remove: () => {
        this._cluster?.removeLayer(marker);
        marker.remove();
        const index = this._clusterable.indexOf(marker);
        if (index !== -1) {
          this._clusterable.splice(index, 1);
        }
      },
    };
    marker.engineHandle = handle;

    if (options.cluster) {
      // Placed on the map by the next setClustering call
      this._clusterable.push(marker);
    } else {
      marker.addTo(this.leafletMap!);
    }
    return handle;
  }

  public addCircle(
    center: MapLatLng,
    options: MapCircleOptions
  ): MapItemHandle {
    const circle = this.Leaflet!.circle(center, {
      interactive: false,
      color: options.color,
      radius: options.radius,
    }).addTo(this.leafletMap!);
    return { remove: () => circle.remove() };
  }

  public addPath(path: MapPath): MapItemHandle {
    const items: (Polyline | CircleMarker)[] = [];
    for (const segment of path.segments) {
      items.push(
        this.Leaflet!.polyline(segment.points, {
          color: path.color,
          opacity: segment.opacity,
          interactive: false,
        })
      );
    }
    for (const pathMarker of path.markers) {
      items.push(
        this.Leaflet!.circleMarker(pathMarker.location, {
          radius: isTouch ? 8 : 3,
          color: path.color,
          opacity: pathMarker.opacity,
          fillOpacity: pathMarker.opacity,
          interactive: true,
        }).bindTooltip(pathMarker.tooltipHtml, { direction: "top" })
      );
    }
    items.forEach((item) => item.addTo(this.leafletMap!));
    return { remove: () => items.forEach((item) => item.remove()) };
  }

  public setClustering(options: MapClusterOptions | null): void {
    if (this._cluster) {
      this._cluster.remove();
      this._cluster = undefined;
    }
    this._clusterOptions = options;
    if (!this.leafletMap || !this.Leaflet) {
      return;
    }
    if (!options) {
      this._clusterable.forEach((marker) => marker.addTo(this.leafletMap!));
      return;
    }
    // markercluster groups by proximity only; groupKey is not supported here
    this._cluster = this.Leaflet.markerClusterGroup({
      showCoverageOnHover: false,
      removeOutsideVisibleBounds: false,
      maxClusterRadius: options.radius,
      iconCreateFunction: (cluster) => {
        const members = (cluster.getAllChildMarkers() as HandledMarker[]).map(
          (marker) => marker.engineHandle!
        );
        const latLng = cluster.getLatLng();
        const icon = this._clusterOptions!.iconBuilder(members, [
          latLng.lat,
          latLng.lng,
        ]);
        // The element fills the divIcon wrapper, which gets the size
        icon.element.style.width = `${icon.size[0]}px`;
        icon.element.style.height = `${icon.size[1]}px`;
        // markercluster pins icons to the cluster, so a location override becomes an anchor shift
        let anchor = icon.anchor;
        if (icon.location) {
          const clusterPoint = this._project([latLng.lat, latLng.lng]);
          const targetPoint = this._project(icon.location);
          const base = anchor ?? [icon.size[0] / 2, icon.size[1] / 2];
          anchor = [
            base[0] - (targetPoint.x - clusterPoint.x),
            base[1] - (targetPoint.y - clusterPoint.y),
          ];
        }
        return this.Leaflet!.divIcon({
          html: icon.element,
          iconSize: icon.size,
          iconAnchor: anchor,
          className: "",
        });
      },
    });
    this._cluster.addLayers(this._clusterable);
    this.leafletMap!.addLayer(this._cluster!);
  }

  public refreshClusters(): void {
    this._cluster?.refreshClusters();
  }
}
