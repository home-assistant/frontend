export interface CustomIcon {
  path: string;
  viewBox?: string;
}

export interface CustomIconsetsWindow {
  customIconsets?: { [key: string]: (name: string) => Promise<CustomIcon> };
  customIconsetsLists?: { [key: string]: () => Promise<string[]> };
}

const customIconsetsWindow = window as CustomIconsetsWindow;

if (!("customIconsets" in customIconsetsWindow)) {
  customIconsetsWindow.customIconsets = {};
}

if (!("customIconsetsLists" in customIconsetsWindow)) {
  customIconsetsWindow.customIconsetsLists = {};
}

export const customIconsets = customIconsetsWindow.customIconsets!;
export const customIconsetsLists = customIconsetsWindow.customIconsetsLists!;
