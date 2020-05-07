export interface CustomIcons {
  [key: string]: { path: string; viewBox?: string };
}

export interface CustomIconsetsWindow {
  customIconsets?: Map<string, (name: string) => Promise<CustomIcons>>;
}

const customIconsetsWindow = window as CustomIconsetsWindow;

if (!("customIconsets" in customIconsetsWindow)) {
  customIconsetsWindow.customIconsets = new Map();
}

export const customIconsets = customIconsetsWindow.customIconsets!;
