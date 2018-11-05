export default function hasLocation(stateObj) {
  return (
    "latitude" in stateObj.attributes && "longitude" in stateObj.attributes
  );
}
