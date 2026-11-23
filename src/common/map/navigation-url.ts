import { isAndroidDevice } from "../../util/is_android";
import { isIosDevice } from "../../util/is_ios";

export const navigationUrl = (latitude: number, longitude: number): string => {
  const point = `${latitude},${longitude}`;
  if (isIosDevice()) {
    return `https://maps.apple.com/?daddr=${point}`;
  }
  if (isAndroidDevice()) {
    return `geo:${point}?q=${point}`;
  }
  return `https://www.openstreetmap.org/directions?to=${encodeURIComponent(point)}#map=15/${latitude}/${longitude}`;
};
