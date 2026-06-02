import { waitForMs } from "../common/util/wait";
import type { HomeAssistant } from "../types";

export interface BrandsOptions {
  domain: string;
  type: "icon" | "logo" | "icon@2x" | "logo@2x";
  darkOptimized?: boolean;
}

export interface HardwareBrandsOptions {
  category: string;
  model?: string;
  manufacturer: string;
  darkOptimized?: boolean;
}

let _brandsAccessToken: string | undefined;
let _brandsRefreshInterval: ReturnType<typeof setInterval> | undefined;

// Token refreshes every 30 minutes and is valid for 1 hour.
// Re-fetch every 30 minutes to always have a valid token.
const TOKEN_REFRESH_MS = 30 * 60 * 1000;

// Delays before each attempt. The first attempt fires immediately; subsequent
// ones back off to ride through the window after a Home Assistant restart
// where the WebSocket server accepts connections but the brands integration
// hasn't registered its WS handler yet. On older backends without the command,
// every attempt fails and we give up.
const FETCH_DELAYS_MS = [0, 500, 1000, 2000, 5000, 10000, 15000];

// Returns true if the cached token changed as a result of this call, so
// callers can decide whether they need to trigger a re-render.
export const fetchAndScheduleBrandsAccessToken = async (
  hass: HomeAssistant
): Promise<boolean> => {
  const previousToken = _brandsAccessToken;
  /* eslint-disable no-await-in-loop -- retries are intentionally sequential */
  for (const delay of FETCH_DELAYS_MS) {
    if (delay) {
      await waitForMs(delay);
    }
    try {
      await fetchBrandsAccessToken(hass);
      scheduleBrandsTokenRefresh(hass);
      return _brandsAccessToken !== previousToken;
    } catch {
      // try next delay
    }
  }
  /* eslint-enable no-await-in-loop */
  return false;
};

export const fetchBrandsAccessToken = async (
  hass: HomeAssistant
): Promise<void> => {
  const result = await hass.callWS<{ token: string }>({
    type: "brands/access_token",
  });
  _brandsAccessToken = result.token;
};

export const scheduleBrandsTokenRefresh = (hass: HomeAssistant): void => {
  clearBrandsTokenRefresh();
  _brandsRefreshInterval = setInterval(() => {
    fetchBrandsAccessToken(hass).catch(() => {
      // Ignore failures; older backends may not support this command
    });
  }, TOKEN_REFRESH_MS);
};

export const clearBrandsTokenRefresh = (): void => {
  if (_brandsRefreshInterval) {
    clearInterval(_brandsRefreshInterval);
    _brandsRefreshInterval = undefined;
  }
};

export const brandsUrl = (options: BrandsOptions, hassUrl?: string): string => {
  hassUrl = hassUrl ?? location.origin;
  const base = `/api/brands/integration/${options.domain}/${
    options.darkOptimized ? "dark_" : ""
  }${options.type}.png`;

  const url = new URL(base, hassUrl);
  if (_brandsAccessToken) {
    url.searchParams.set("token", _brandsAccessToken);
  }
  return url.toString();
};

export const hardwareBrandsUrl = (
  options: HardwareBrandsOptions,
  hassUrl?: string
): string => {
  hassUrl = hassUrl ?? location.origin;
  const base = `/api/brands/hardware/${options.category}/${
    options.darkOptimized ? "dark_" : ""
  }${options.manufacturer}${options.model ? `_${options.model}` : ""}.png`;

  const url = new URL(base, hassUrl);
  if (_brandsAccessToken) {
    url.searchParams.set("token", _brandsAccessToken);
  }
  return url.toString();
};

export const addBrandsAuth = (url: string, hassUrl?: string): string => {
  hassUrl = hassUrl ?? location.origin;
  if (!_brandsAccessToken) {
    return url;
  }

  try {
    const parsedUrl = new URL(url, hassUrl);
    if (!parsedUrl.pathname.startsWith("/api/brands/")) {
      return url;
    }
    parsedUrl.searchParams.set("token", _brandsAccessToken);
    return parsedUrl.toString();
  } catch {
    return url;
  }
};

export const extractDomainFromBrandUrl = (url: string): string => {
  // Handle both new local API paths (/api/brands/integration/{domain}/...)
  // and legacy CDN URLs (https://brands.home-assistant.io/_/{domain}/...)
  const parsed = new URL(url, location.origin);
  if (parsed.pathname.startsWith("/api/brands/")) {
    // /api/brands/integration/{domain}/... -> ["" ,"api", "brands", "integration", "{domain}", ...]
    return parsed.pathname.split("/")[4];
  }
  // https://brands.home-assistant.io/_/{domain}/... -> ["", "_", "{domain}", ...]
  const segments = parsed.pathname.split("/").filter((s) => s.length > 0);
  const underscoreIdx = segments.indexOf("_");
  if (underscoreIdx !== -1 && underscoreIdx + 1 < segments.length) {
    return segments[underscoreIdx + 1];
  }
  return segments[1] ?? "";
};

export const isBrandUrl = (thumbnail: string | ""): boolean => {
  try {
    const url = new URL(thumbnail, location.origin);
    return (
      url.pathname.startsWith("/api/brands/") ||
      thumbnail.startsWith("https://brands.home-assistant.io/")
    );
  } catch {
    return false;
  }
};
