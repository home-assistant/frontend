//Single shared maplibre-gl instance for every maplibre-gl card on the page. Two live
//copies fight over MapLibre's worker class registry (objects are looked up by
//`constructor._classRegistryKey`), so the second map's worker-fed layers fail with
//"undefined is not an object (evaluating '..._classRegistryKey')". The first card to
//evaluate this module publishes its copy on a global and every other card reuses it,
//so one worker and one registry serve them all. Requires every card to bundle the same
//major version (all track 5.x).
import bundled from "maplibre-gl";

type MaplibreModule = typeof bundled;

const shared = globalThis as typeof globalThis & {
  __maplibreGLShared?: MaplibreModule;
};
const maplibregl: MaplibreModule = (shared.__maplibreGLShared ??= bundled);

export default maplibregl;
