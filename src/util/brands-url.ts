export interface BrandsOptions {
  domain: string;
  type: "icon" | "logo" | "icon@2x" | "logo@2x";
  useFallback?: boolean;
  darkOptimized?: boolean;
}

export interface HardwareBrandsOptions extends Partial<BrandsOptions> {
  name: string;
}

export const brandsUrl = (options: BrandsOptions): string =>
  `https://brands.home-assistant.io/${options.useFallback ? "_/" : ""}${
    options.domain
  }/${options.darkOptimized ? "dark_" : ""}${options.type}.png`;

export const hardwareBrandsUrl = (options: HardwareBrandsOptions): string =>
  `https://brands.home-assistant.io/hardware/${options.domain}/${
    options.darkOptimized ? "dark_" : ""
  }${options.name}.png`;

export const extractDomainFromBrandUrl = (url: string) => url.split("/")[4];
