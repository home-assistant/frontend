export interface CustomIcon {
  path: string;
  viewBox?: string;
}

export interface CustomIconsetsWindow {
  customIconsets?: { [key: string]: (name: string) => Promise<CustomIcon> };
}

const customIconsetsWindow = window as CustomIconsetsWindow;

if (!("customIconsets" in customIconsetsWindow)) {
  customIconsetsWindow.customIconsets = {};
}

export const customIconsets = customIconsetsWindow.customIconsets!;
