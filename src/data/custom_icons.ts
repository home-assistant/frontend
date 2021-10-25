import { customIconsets } from "./custom_iconsets";

export interface CustomIcon {
  path: string;
  viewBox?: string;
}

export interface CustomIconHelpers {
  getIcon: (name: string) => Promise<CustomIcon>;
  getIconList?: () => Promise<string[]>;
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
  get: function (obj, prop: string) {
    return (
      obj[prop] ??
      (customIconsets[prop]
        ? {
            getIcon: customIconsets[prop],
          }
        : undefined)
    );
  },
  has: function (obj, prop: string) {
    return Boolean(obj[prop] || customIconsets[prop]);
  },
});

(window as any).customIconsProxy = customIcons;
