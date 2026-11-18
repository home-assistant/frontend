import type {
  LocationSelector,
  LocationSelectorValue,
} from "../../data/selector";

const DEFAULT_RADIUS = 1000;

/**
 * The selector's value from its form's value. A missing radius falls back to
 * the default the map draws, and a read-only radius is kept as is because core
 * stores it as a float.
 */
export const computeLocationSelectorValue = (
  selector: LocationSelector,
  value: LocationSelectorValue
): LocationSelectorValue => {
  if (!selector.location?.radius) {
    return { latitude: value.latitude, longitude: value.longitude };
  }
  const radius = value.radius ?? DEFAULT_RADIUS;
  return {
    latitude: value.latitude,
    longitude: value.longitude,
    radius: selector.location.radius_readonly ? radius : Math.round(radius),
  };
};
