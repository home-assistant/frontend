export const brandsUrl = (
  domain: string,
  type: "icon" | "logo",
  useFallback?: boolean
): string =>
  `https://brands.home-assistant.io/${
    useFallback ? "_/" : ""
  }${domain}/${type}.png`;
