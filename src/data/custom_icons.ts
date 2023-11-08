import { customIconsets } from "./custom_iconsets";

export interface CustomIcon {
  path: string;
  secondaryPath?: string;
  viewBox?: string;
}

export interface CustomIconListItem {
  name: string;
  keywords?: string[];
}

export interface CustomIconHelpers {
  getIcon: (name: string) => Promise<CustomIcon>;
  getIconList?: () => Promise<CustomIconListItem[]>;
}

export interface CustomIconsWindow {
  customIcons?: {
    [key: string]: CustomIconHelpers;
  };
}

const customIconsWindow = window as CustomIconsWindow;

if (!("customIcons" in customIconsWindow)) {
  customIconsWindow.customIcons = {};
}

// Proxy for backward compatibility with icon sets
export const customIcons = new Proxy(customIconsWindow.customIcons!, {
  get: (obj, prop: string) =>
    obj[prop] ??
    (customIconsets[prop]
      ? {
          getIcon: customIconsets[prop],
        }
      : undefined),
});
