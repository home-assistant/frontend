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

export const customIcons = customIconsWindow.customIcons!;
