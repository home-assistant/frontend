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

export const fetchBrandsAccessToken = async (
  hass: HomeAssistant
): Promise<void> => {
  const result = await hass.callWS<{ token: string }>({
    type: "brands/access_token",
  });
  _brandsAccessToken = result.token;
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
