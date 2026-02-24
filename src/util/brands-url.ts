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
  }${options.type}.png?fallback=placeholder`;
  if (_brandsAccessToken) {
    return `${base}&token=${_brandsAccessToken}`;
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
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${_brandsAccessToken}`;
};

export const extractDomainFromBrandUrl = (url: string): string => {
  // Handle both new local API paths (/api/brands/integration/{domain}/...)
  // and legacy CDN URLs (https://brands.home-assistant.io/_/{domain}/...)
  if (url.startsWith("/api/brands/")) {
    return url.split("/")[4];
  }
  return url.split("/")[4];
};

export const isBrandUrl = (thumbnail: string | ""): boolean =>
  thumbnail.startsWith("/api/brands/") ||
  thumbnail.startsWith("https://brands.home-assistant.io/");
