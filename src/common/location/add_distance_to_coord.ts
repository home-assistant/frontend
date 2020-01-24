export const addDistanceToCoord = (
  location: [number, number],
  dx: number,
  dy: number
): [number, number] => {
  const rEarth = 6378000;
  const newLatitude = location[0] + (dy / rEarth) * (180 / Math.PI);
  const newLongitude =
    location[1] +
    ((dx / rEarth) * (180 / Math.PI)) / Math.cos((location[0] * Math.PI) / 180);
  return [newLatitude, newLongitude];
};
