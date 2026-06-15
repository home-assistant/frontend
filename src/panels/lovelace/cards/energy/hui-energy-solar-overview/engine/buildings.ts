//Self-sourced building footprints around the home. We fetch the 1–4 OpenFreeMap
//planet vector tiles covering the radius ourselves (once per home/radius/cluster
//tuple), decode them, filter by distance, identify the home polygon(s), and emit
//two FeatureCollections (home at full opacity, surroundings at configured opacity)
//for two distinct fill-extrusion layers. Doing the filtering up front avoids the
//per-tile-boundary flicker and per-frame extrusion cost of the full basemap.

import { VectorTile } from "@mapbox/vector-tile";
import { PbfReader } from "pbf";

export interface BuildingsResult {
  home: GeoJSON.FeatureCollection;
  surroundings: GeoJSON.FeatureCollection;
}

export interface FetchBuildingsOptions {
  homeLon: number;
  homeLat: number;
  radiusMeters: number;
  //Buildings within this radius (m) of the home, or containing it, group into the
  //"home" collection at full opacity (attached verandas / outbuildings). 0 = single polygon.
  clusterRadiusMeters?: number;
  //Tile zoom. z=14 carries `render_height` and keeps the tile count to 1 (rarely 2)
  //for radii under ~500 m.
  zoom?: number;
  signal?: AbortSignal;
}

const EARTH_RADIUS_M = 6_371_008.8;
//If no polygon contains the home point, pick the nearest one within this radius
//(HA's home coordinate often lands in a garden a few metres off the building).
const HOME_FALLBACK_M = 30;

function lonLatToTile(
  lon: number,
  lat: number,
  z: number
): { x: number; y: number } {
  const n = 2 ** z;
  const latRad = (lat * Math.PI) / 180;
  const x = Math.floor(((lon + 180) / 360) * n);
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y };
}

function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

function metersToDegLat(m: number): number {
  return m / 111_320;
}

function metersToDegLon(m: number, atLat: number): number {
  return m / (111_320 * Math.cos((atLat * Math.PI) / 180));
}

//Ray-casting point-in-polygon for a single ring (lon,lat pairs).
function pointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      yi > lat !== yj > lat &&
      lon < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

//"Point is in the outer ring of any polygon". Holes are ignored.
function polygonContains(
  geom: GeoJSON.Geometry,
  lon: number,
  lat: number
): boolean {
  if (geom.type === "Polygon") {
    return (
      geom.coordinates.length > 0 &&
      pointInRing(lon, lat, geom.coordinates[0] as number[][])
    );
  }
  if (geom.type === "MultiPolygon") {
    return geom.coordinates.some(
      (poly) => poly.length > 0 && pointInRing(lon, lat, poly[0] as number[][])
    );
  }
  return false;
}

//Centroid approximation (average of outer-ring vertices) for the radius filter.
function representativePoint(geom: GeoJSON.Geometry): [number, number] | null {
  let ring: number[][] | null = null;
  if (geom.type === "Polygon" && geom.coordinates.length > 0) {
    ring = geom.coordinates[0] as number[][];
  } else if (
    geom.type === "MultiPolygon" &&
    geom.coordinates.length > 0 &&
    geom.coordinates[0].length > 0
  ) {
    ring = geom.coordinates[0][0] as number[][];
  }
  if (!ring || ring.length === 0) {
    return null;
  }
  let sx = 0;
  let sy = 0;
  for (const p of ring) {
    sx += p[0];
    sy += p[1];
  }
  return [sx / ring.length, sy / ring.length];
}

//OpenFreeMap rotates its tile URL template every few weeks; the /planet TileJSON
//exposes the current one. Resolved once per page lifetime and cached.
const OFM_TILEJSON_URL = "https://tiles.openfreemap.org/planet";
let _ofmTileTemplate: string | null = null;
let _ofmTileTemplateInflight: Promise<string | null> | null = null;

async function getOpenFreeMapTileTemplate(
  signal?: AbortSignal
): Promise<string | null> {
  if (_ofmTileTemplate) {
    return _ofmTileTemplate;
  }
  if (_ofmTileTemplateInflight) {
    return _ofmTileTemplateInflight;
  }

  _ofmTileTemplateInflight = (async (): Promise<string | null> => {
    try {
      const resp = await fetch(OFM_TILEJSON_URL, { signal });
      if (!resp.ok) {
        return null;
      }
      const tj = (await resp.json()) as { tiles?: string[] };
      const url =
        Array.isArray(tj.tiles) && tj.tiles.length > 0 ? tj.tiles[0] : null;
      if (!url) {
        return null;
      }
      _ofmTileTemplate = url;
      return url;
    } catch (_) {
      return null;
    } finally {
      _ofmTileTemplateInflight = null;
    }
  })();
  return _ofmTileTemplateInflight;
}

export async function fetchBuildingsAroundHome(
  opts: FetchBuildingsOptions
): Promise<BuildingsResult> {
  const z = Math.max(0, Math.floor(opts.zoom ?? 14));
  const r = Math.max(1, opts.radiusMeters);
  const cluster = Math.max(0, opts.clusterRadiusMeters ?? 0);

  //Bbox around the home, over-estimated ~15 % so a building whose centroid is just
  //outside but whose nearest corner is inside the radius still gets fetched (the
  //extras are dropped at the haversine step below).
  const padFactor = 1.15;
  const dLat = metersToDegLat(r * padFactor);
  const dLon = metersToDegLon(r * padFactor, opts.homeLat);
  const minLat = opts.homeLat - dLat;
  const maxLat = opts.homeLat + dLat;
  const minLon = opts.homeLon - dLon;
  const maxLon = opts.homeLon + dLon;

  //Tile range covering the bbox. Note Y is inverted (north-up).
  const tlTile = lonLatToTile(minLon, maxLat, z);
  const brTile = lonLatToTile(maxLon, minLat, z);
  const xMin = Math.min(tlTile.x, brTile.x);
  const xMax = Math.max(tlTile.x, brTile.x);
  const yMin = Math.min(tlTile.y, brTile.y);
  const yMax = Math.max(tlTile.y, brTile.y);

  const tilesToFetch: { x: number; y: number }[] = [];
  for (let x = xMin; x <= xMax; x++) {
    for (let y = yMin; y <= yMax; y++) {
      tilesToFetch.push({ x, y });
    }
  }

  //Expect 1–4 tiles; more means radius/zoom is misconfigured, so bail.
  if (tilesToFetch.length > 16) {
    throw new Error(
      `[SOLAR-OVERVIEW] fetchBuildingsAroundHome: ${tilesToFetch.length} tiles requested, radius/zoom misconfigured`
    );
  }

  const tileTemplate = await getOpenFreeMapTileTemplate(opts.signal);
  if (!tileTemplate) {
    return {
      home: { type: "FeatureCollection", features: [] },
      surroundings: { type: "FeatureCollection", features: [] },
    };
  }

  const features: GeoJSON.Feature[] = [];
  await Promise.all(
    tilesToFetch.map(async ({ x, y }) => {
      const url = tileTemplate
        .replace("{z}", String(z))
        .replace("{x}", String(x))
        .replace("{y}", String(y));
      let resp: Response;
      try {
        resp = await fetch(url, { signal: opts.signal });
      } catch (_) {
        //Skip this tile silently; surroundings get sparser but the card stays usable.
        return;
      }
      if (!resp.ok) {
        return;
      }
      let buf: ArrayBuffer;
      try {
        buf = await resp.arrayBuffer();
      } catch (_) {
        return;
      }
      if (buf.byteLength === 0) {
        return;
      }

      let tile: VectorTile;
      try {
        tile = new VectorTile(new PbfReader(new Uint8Array(buf)));
      } catch (_) {
        return;
      }
      const layer = tile.layers["building"];
      if (!layer) {
        return;
      }

      for (let i = 0; i < layer.length; i++) {
        let geojson: GeoJSON.Feature;
        try {
          geojson = layer.feature(i).toGeoJSON(x, y, z) as GeoJSON.Feature;
        } catch (_) {
          continue;
        }
        if (!geojson.geometry) {
          continue;
        }

        //Split MultiPolygons into independent Polygon features: the encoder groups
        //unrelated buildings into one MultiPolygon, which would make home detection
        //capture every grouped building at full opacity.
        if (geojson.geometry.type === "Polygon") {
          //Rebuild as a plain feature: toGeoJSON returns null-prototype `properties`,
          //and maplibre's worker serializer reads `constructor._classRegistryKey`,
          //which throws on a null-proto object. The spread gives a normal prototype.
          features.push({
            type: "Feature",
            geometry: {
              type: "Polygon",
              coordinates: geojson.geometry.coordinates as number[][][],
            },
            properties: { ...(geojson.properties ?? {}) },
          });
        } else if (geojson.geometry.type === "MultiPolygon") {
          for (const polyCoords of geojson.geometry.coordinates) {
            features.push({
              type: "Feature",
              geometry: {
                type: "Polygon",
                coordinates: polyCoords as number[][][],
              },
              properties: { ...(geojson.properties ?? {}) },
            });
          }
        }
      }
    })
  );

  //Classify each feature: home cluster (contains the home point or within `cluster`
  //metres), surroundings (within `r`), or discarded. If nothing lands in the cluster,
  //the fallback below promotes the closest building within HOME_FALLBACK_M.
  const homeCluster: GeoJSON.Feature[] = [];
  const surroundings: GeoJSON.Feature[] = [];
  let homeFallback: { feature: GeoJSON.Feature; distance: number } | null =
    null;

  for (const f of features) {
    const contains = polygonContains(f.geometry, opts.homeLon, opts.homeLat);
    const rep = representativePoint(f.geometry);
    const d = rep
      ? haversineMeters(opts.homeLat, opts.homeLon, rep[1], rep[0])
      : Infinity;

    if (contains || (cluster > 0 && d <= cluster)) {
      homeCluster.push(f);
      continue;
    }

    if (
      rep &&
      d <= HOME_FALLBACK_M &&
      (!homeFallback || d < homeFallback.distance)
    ) {
      homeFallback = { feature: f, distance: d };
    }

    if (d <= r) {
      surroundings.push(f);
    }
  }

  //Promote the fallback when no feature was in the cluster.
  if (homeCluster.length === 0 && homeFallback) {
    homeCluster.push(homeFallback.feature);
    const idx = surroundings.indexOf(homeFallback.feature);
    if (idx >= 0) {
      surroundings.splice(idx, 1);
    }
  }

  return {
    home: { type: "FeatureCollection", features: homeCluster },
    surroundings: { type: "FeatureCollection", features: surroundings },
  };
}
