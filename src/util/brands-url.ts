export interface BrandsOptions {
  domain: string;
  type: "icon" | "logo" | "icon@2x" | "logo@2x";
  useFallback?: boolean;
  darkOptimized?: boolean;
}

export const brandsUrl = (options: BrandsOptions): string =>
  `https://brands.home-assistant.io/${options.useFallback ? "_/" : ""}${
    options.domain
  }/${options.darkOptimized ? "dark_" : ""}${options.type}.png`;
