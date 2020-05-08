export interface CustomIcons {
  [key: string]: { path: string; viewBox?: string };
}

export interface CustomIconsetsWindow {
  customIconsets?: { [key: string]: (name: string) => Promise<CustomIcons> };
}

const customIconsetsWindow = window as CustomIconsetsWindow;

if (!("customIconsets" in customIconsetsWindow)) {
  customIconsetsWindow.customIconsets = {};
}

export const customIconsets = customIconsetsWindow.customIconsets!;
