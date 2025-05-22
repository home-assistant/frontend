import type { LatLngExpression, Layer, Map, MarkerOptions } from "leaflet";
import { Marker } from "leaflet";

export class DecoratedMarker extends Marker {
  decorationLayer: Layer | undefined;

  constructor(
    latlng: LatLngExpression,
    decorationLayer?: Layer,
    options?: MarkerOptions
  ) {
    super(latlng, options);

    this.decorationLayer = decorationLayer;
  }

  onAdd(map: Map) {
    super.onAdd(map);

    // If decoration has been provided, add it to the map as well
    this.decorationLayer?.addTo(map);

    return this;
  }

  onRemove(map: Map) {
    // If decoration has been provided, remove it from the map as well
    this.decorationLayer?.remove();

    return super.onRemove(map);
  }
}
