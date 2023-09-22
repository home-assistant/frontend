export interface BrandsOptions {
  domain: string;
  type: "icon" | "logo" | "icon@2x" | "logo@2x";
  useFallback?: boolean;
  darkOptimized?: boolean;
  brand?: boolean;
}

export interface HardwareBrandsOptions {
  category: string;
  model?: string;
  manufacturer: string;
  darkOptimized?: boolean;
}

export const brandsUrl = (options: BrandsOptions): string =>
  `https://brands.home-assistant.io/${options.brand ? "brands/" : ""}${
    options.domain
  }/${options.darkOptimized ? "dark_" : ""}${options.type}.png${
    options.useFallback ? "?fallback=true" : ""
  }`;

export const hardwareBrandsUrl = (options: HardwareBrandsOptions): string =>
  `https://brands.home-assistant.io/hardware/${options.category}/${
    options.darkOptimized ? "dark_" : ""
  }${options.manufacturer}${options.model ? `_${options.model}` : ""}.png`;

export const extractDomainFromBrandUrl = (url: string) =>
  url.split("/").reverse()[1];

export const isBrandUrl = (thumbnail: string): boolean =>
  thumbnail.startsWith("https://brands.home-assistant.io/");
