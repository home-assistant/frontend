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

export const fetchAndScheduleBrandsAccessToken = (
  hass: HomeAssistant
): Promise<void> =>
  fetchBrandsAccessToken(hass).then(
    () => scheduleBrandsTokenRefresh(hass),
    () => {
      // Ignore failures; older backends may not support this command
    }
  );

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

export const brandsUrl = (options: BrandsOptions): string => {
  const base = `/api/brands/integration/${options.domain}/${
    options.darkOptimized ? "dark_" : ""
  }${options.type}.png`;
  if (_brandsAccessToken) {
    return `${base}?token=${_brandsAccessToken}`;
  }
  return base;
};

export const hardwareBrandsUrl = (options: HardwareBrandsOptions): string => {
  const base = `/api/brands/hardware/${options.category}/${
    options.darkOptimized ? "dark_" : ""
  }${options.manufacturer}${options.model ? `_${options.model}` : ""}.png`;
  if (_brandsAccessToken) {
    return `${base}?token=${_brandsAccessToken}`;
  }
  return base;
};

export const addBrandsAuth = (url: string): string => {
  if (!_brandsAccessToken || !url.startsWith("/api/brands/")) {
    return url;
  }
  const fullUrl = new URL(url, location.origin);
  fullUrl.searchParams.set("token", _brandsAccessToken);
  return `${fullUrl.pathname}${fullUrl.search}`;
};

export const extractDomainFromBrandUrl = (url: string): string => {
  // Handle both new local API paths (/api/brands/integration/{domain}/...)
  // and legacy CDN URLs (https://brands.home-assistant.io/_/{domain}/...)
  if (url.startsWith("/api/brands/")) {
    // /api/brands/integration/{domain}/... -> ["" ,"api", "brands", "integration", "{domain}", ...]
    return url.split("/")[4];
  }
  // https://brands.home-assistant.io/_/{domain}/... -> ["", "_", "{domain}", ...]
  const parsed = new URL(url);
  const segments = parsed.pathname.split("/").filter((s) => s.length > 0);
  const underscoreIdx = segments.indexOf("_");
  if (underscoreIdx !== -1 && underscoreIdx + 1 < segments.length) {
    return segments[underscoreIdx + 1];
  }
  return segments[1] ?? "";
};

export const isBrandUrl = (thumbnail: string | ""): boolean =>
  thumbnail.startsWith("/api/brands/") ||
  thumbnail.startsWith("https://brands.home-assistant.io/");
