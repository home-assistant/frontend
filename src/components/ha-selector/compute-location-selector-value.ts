import type {
  LocationSelector,
  LocationSelectorValue,
} from "../../data/selector";

export const DEFAULT_RADIUS = 1000;

/**
 * The selector's value from its form's value. A value that never had a radius
 * falls back to the default the map draws, while a radius the user cleared is
 * left out so the field stays empty. A read-only radius is kept as is because
 * core stores it as a float.
 */
export const computeLocationSelectorValue = (
  selector: LocationSelector,
  value: LocationSelectorValue
): LocationSelectorValue => {
  if (!selector.location?.radius) {
    return { latitude: value.latitude, longitude: value.longitude };
  }
  const radius = "radius" in value ? value.radius : DEFAULT_RADIUS;
  if (radius === undefined || radius === null) {
    return { latitude: value.latitude, longitude: value.longitude };
  }
  return {
    latitude: value.latitude,
    longitude: value.longitude,
    radius: selector.location.radius_readonly ? radius : Math.round(radius),
  };
};
